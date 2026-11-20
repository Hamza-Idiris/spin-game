// Backup & restore. Callable by an Admin (JWT) or by Supabase Cron (x-cron-secret header).
// Formats inside every package: structured JSON, logical SQL data dump, manifest, per-file SHA-256 checksums (ZIP).
import JSZip from 'npm:jszip@3';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, json, preflight } from '../_shared/cors.ts';
import { requireAdmin, serviceClient, logSystemError, type AdminCtx } from '../_shared/clients.ts';
import { decryptBytes, encryptBytes, isEncrypted, sha256Hex } from '../_shared/backupcrypto.ts';

export const SCHEMA_VERSION = 1;
const BUCKET = 'backups';
const DATA_TABLES = [
  'website_settings', 'backup_settings', 'visitor_sessions', 'spin_results', 'activities', 'page_visits', 'spin_activities',
  'export_logs', 'spin_participants', 'spin_groups', 'spin_group_members', 'team_matchups', 'system_errors', 'admin_activity_logs',
];
const REFERENCE_TABLES = ['admin_users', 'backup_records']; // included for completeness, never overwritten by restore
const RETENTION_OK = [30, 90, 180, 365, null];

type Kind = 'manual' | 'daily' | 'weekly' | 'safety';
const ENC_KEY = () => Deno.env.get('BACKUP_ENCRYPTION_KEY') ?? '';

async function fetchAll(db: SupabaseClient, table: string): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select('*').range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

function sqlDump(data: Record<string, unknown[]>): string {
  let out = '-- SPIN logical data dump. Restore into an empty/truncated schema created by the migrations.\nbegin;\n';
  for (const t of DATA_TABLES) {
    const payload = JSON.stringify(data[t] ?? []).replaceAll('$spin$', '$ spin $');
    out += `insert into public.${t} select * from jsonb_populate_recordset(null::public.${t}, $spin$${payload}$spin$::jsonb);\n`;
  }
  return out + 'commit;\n';
}

async function notifyFailure(db: SupabaseClient, kind: string, message: string) {
  const key = Deno.env.get('RESEND_API_KEY');
  const { data: s } = await db.from('backup_settings').select('notify_email').eq('id', 1).maybeSingle();
  const to = s?.notify_email || Deno.env.get('ADMIN_NOTIFY_EMAIL');
  if (!key || !to) return; // the failure is still shown in the dashboard (Overview + Backup pages)
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: Deno.env.get('NOTIFY_FROM') ?? 'SPIN <onboarding@resend.dev>', to, subject: `SPIN ${kind} backup failed`, text: message }),
  }).catch(() => {});
}

async function cleanupExpired(db: SupabaseClient) {
  const { data } = await db.from('backup_records').select('id,file_path').lt('expires_at', new Date().toISOString());
  for (const r of data ?? []) {
    if (r.file_path) await db.storage.from(BUCKET).remove([r.file_path]);
    await db.from('backup_records').delete().eq('id', r.id);
  }
}

async function createBackup(db: SupabaseClient, kind: Kind, admin: AdminCtx | null, retentionOverride?: number | null) {
  const { data: bs } = await db.from('backup_settings').select('*').eq('id', 1).maybeSingle();
  if ((kind === 'daily' && bs && !bs.daily_enabled) || (kind === 'weekly' && bs && !bs.weekly_enabled)) return { skipped: true };
  const retention = retentionOverride !== undefined ? retentionOverride : (bs?.retention_days ?? null);
  const { data: rec, error: insErr } = await db.from('backup_records').insert({
    kind, status: 'running', created_by: admin?.id ?? null, retention_days: retention,
  }).select().single();
  if (insErr) throw insErr;
  try {
    const data: Record<string, Record<string, unknown>[]> = {};
    for (const t of [...DATA_TABLES, ...REFERENCE_TABLES]) data[t] = await fetchAll(db, t);
    const tableCounts = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.length]));
    const createdAt = new Date().toISOString();
    const manifest = { app: 'spin', schemaVersion: SCHEMA_VERSION, createdAt, kind, backupId: rec.id, tableCounts, restoredTables: DATA_TABLES, notes: 'admin_users and backup_records are included for reference and are not overwritten on restore. Auth users and storage files are backed up via Supabase.' };
    const enc = new TextEncoder();
    const files: Record<string, Uint8Array> = {
      'manifest.json': enc.encode(JSON.stringify(manifest, null, 2)),
      'data.json': enc.encode(JSON.stringify(data)),
      'dump.sql': enc.encode(sqlDump(data)),
    };
    const checksums: Record<string, string> = {};
    for (const [n, b] of Object.entries(files)) checksums[n] = await sha256Hex(b);
    const zip = new JSZip();
    for (const [n, b] of Object.entries(files)) zip.file(n, b);
    zip.file('checksums.json', JSON.stringify(checksums, null, 2));
    let bytes: Uint8Array = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
    const encrypted = ENC_KEY() !== '';
    if (encrypted) bytes = await encryptBytes(bytes, ENC_KEY());
    const checksum = await sha256Hex(bytes);
    const stamp = createdAt.replace(/[:.]/g, '-');
    const path = `${kind}/${createdAt.slice(0, 4)}/spin-${kind}-${stamp}.zip${encrypted ? '.enc' : ''}`;
    const up = await db.storage.from(BUCKET).upload(path, bytes, { contentType: 'application/octet-stream', upsert: false });
    if (up.error) throw up.error;

    // integrity: re-download and compare hash
    const dl = await db.storage.from(BUCKET).download(path);
    const back = dl.data ? new Uint8Array(await dl.data.arrayBuffer()) : new Uint8Array();
    const verified = (await sha256Hex(back)) === checksum;

    await db.from('backup_records').update({
      status: 'completed', file_name: path.split('/').pop(), file_path: path, size_bytes: bytes.length, checksum_sha256: checksum,
      encrypted, integrity_status: verified ? 'verified' : 'failed', schema_version: SCHEMA_VERSION, table_counts: tableCounts,
      completed_at: new Date().toISOString(),
      expires_at: retention ? new Date(Date.now() + retention * 86400_000).toISOString() : null,
    }).eq('id', rec.id);
    if (!verified) throw new Error('Integrity check failed after upload');
    await db.rpc('record_event', { p_event: crypto.randomUUID(), p_session: null, p_visitor: null, p_type: 'backup_created', p_path: null, p_entity: rec.id, p_details: { kind, size: bytes.length, encrypted }, p_status: 'success', p_ua: '' });
    if (kind !== 'safety') await cleanupExpired(db);
    return { id: rec.id, path, size: bytes.length, encrypted };
  } catch (e) {
    const msg = String((e as Error).message ?? e);
    await db.from('backup_records').update({ status: 'failed', error: msg.slice(0, 500), completed_at: new Date().toISOString() }).eq('id', rec.id);
    await logSystemError(db, 'backup', e, { kind, backupId: rec.id });
    await db.rpc('record_event', { p_event: crypto.randomUUID(), p_session: null, p_visitor: null, p_type: 'backup_failed', p_path: null, p_entity: rec.id, p_details: { kind, error: msg.slice(0, 300) }, p_status: 'failed', p_ua: '' });
    await notifyFailure(db, kind, msg);
    throw e;
  }
}

/** Downloads + decrypts + unzips + verifies a backup package. Throws on any integrity problem. */
async function openPackage(db: SupabaseClient, rec: Record<string, any>) {
  const dl = await db.storage.from(BUCKET).download(rec.file_path);
  if (dl.error || !dl.data) throw new Error('Backup file could not be downloaded');
  let bytes: Uint8Array = new Uint8Array(await dl.data.arrayBuffer());
  if (await sha256Hex(bytes) !== rec.checksum_sha256) throw new Error('Checksum mismatch: file is corrupted or was modified');
  if (isEncrypted(bytes)) {
    if (!ENC_KEY()) throw new Error('Backup is encrypted but BACKUP_ENCRYPTION_KEY is not configured');
    bytes = await decryptBytes(bytes, ENC_KEY());
  }
  const zip = await JSZip.loadAsync(bytes);
  const sums = JSON.parse(await zip.file('checksums.json')!.async('string')) as Record<string, string>;
  const out: Record<string, Uint8Array> = {};
  for (const [name, expected] of Object.entries(sums)) {
    const f = zip.file(name); if (!f) throw new Error(`Package is missing ${name}`);
    const b = await f.async('uint8array');
    if (await sha256Hex(b) !== expected) throw new Error(`Inner checksum mismatch for ${name}`);
    out[name] = b;
  }
  const manifest = JSON.parse(new TextDecoder().decode(out['manifest.json']));
  return { manifest, data: JSON.parse(new TextDecoder().decode(out['data.json'])) as Record<string, unknown[]> };
}

function checkCompatibility(m: any): string | null {
  if (m?.app !== 'spin') return 'Not a SPIN backup';
  if (!Number.isInteger(m.schemaVersion) || m.schemaVersion > SCHEMA_VERSION) return `Backup schema v${m.schemaVersion} is newer than this application (v${SCHEMA_VERSION})`;
  return null;
}

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  if (req.method !== 'POST') return json(req, { error: 'method_not_allowed' }, 405);
  const db = serviceClient();
  try {
    const b = await req.json().catch(() => null);
    if (!b) return json(req, { error: 'bad_request' }, 400);

    const cron = Deno.env.get('CRON_SECRET');
    const isCron = !!cron && req.headers.get('x-cron-secret') === cron;
    const admin = isCron ? null : await requireAdmin(req, db);
    if (!isCron && !admin) return json(req, { error: 'forbidden' }, 403);
    const audit = (action: string, target: string | null, extra: Record<string, unknown> = {}) =>
      db.from('admin_activity_logs').insert({ admin_id: admin?.id ?? null, admin_email: admin?.email ?? 'cron', action, target, new: extra });

    if (b.action === 'create') {
      const kind: Kind = isCron ? (b.kind === 'weekly' ? 'weekly' : 'daily') : 'manual';
      const r = await createBackup(db, kind, admin);
      await audit('backup_created', kind);
      return json(req, r);
    }
    if (isCron) return json(req, { error: 'forbidden' }, 403);

    if (b.action === 'update_settings') {
      const ret = b.retentionDays === null || b.retentionDays === 'indefinite' ? null : Number(b.retentionDays);
      if (!RETENTION_OK.includes(ret)) return json(req, { error: 'invalid_retention' }, 400);
      const email = typeof b.notifyEmail === 'string' && b.notifyEmail.length < 200 ? b.notifyEmail : null;
      const { data: prev } = await db.from('backup_settings').select('*').eq('id', 1).maybeSingle();
      await db.from('backup_settings').upsert({ id: 1, daily_enabled: b.dailyEnabled !== false, weekly_enabled: b.weeklyEnabled !== false, retention_days: ret, notify_email: email, updated_at: new Date().toISOString(), updated_by: admin!.id });
      await db.from('admin_activity_logs').insert({ admin_id: admin!.id, admin_email: admin!.email, action: 'backup_settings_changed', previous: prev, new: b });
      return json(req, { ok: true });
    }

    const ids: string[] = Array.isArray(b.ids) ? b.ids : b.id ? [b.id] : [];
    const { data: recs } = await db.from('backup_records').select('*').in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
    if (!recs?.length) return json(req, { error: 'not_found' }, 404);

    if (b.action === 'download') {
      const r = recs[0]; if (r.status !== 'completed') return json(req, { error: 'not_ready' }, 409);
      const { data, error } = await db.storage.from(BUCKET).createSignedUrl(r.file_path, 300, { download: r.file_name });
      if (error) throw error;
      await audit('backup_downloaded', r.id);
      return json(req, { url: data.signedUrl });
    }
    if (b.action === 'delete') {
      for (const r of recs) {
        if (r.file_path) await db.storage.from(BUCKET).remove([r.file_path]);
        await db.from('backup_records').delete().eq('id', r.id);
        await audit('backup_deleted', r.id);
      }
      return json(req, { deleted: recs.length });
    }
    if (b.action === 'verify' || b.action === 'inspect') {
      const r = recs[0];
      try {
        const pkg = await openPackage(db, r);
        const compat = checkCompatibility(pkg.manifest);
        await db.from('backup_records').update({ integrity_status: 'verified' }).eq('id', r.id);
        return json(req, { integrity: 'verified', compatible: compat === null, compatibilityError: compat, manifest: pkg.manifest });
      } catch (e) {
        await db.from('backup_records').update({ integrity_status: 'failed' }).eq('id', r.id);
        return json(req, { integrity: 'failed', error: String((e as Error).message) });
      }
    }
    if (b.action === 'restore') {
      const r = recs[0];
      const steps: { step: string; ok: boolean; detail?: string }[] = [];
      const step = (s: string, ok: boolean, detail?: string) => steps.push({ step: s, ok, detail });
      if (b.confirm !== 'RESTORE') return json(req, { error: 'confirmation_required' }, 400);
      try {
        if (r.status !== 'completed') throw new Error('Backup is not complete');
        const pkg = await openPackage(db, r); step('integrity', true);
        const compat = checkCompatibility(pkg.manifest); if (compat) throw new Error(compat); step('compatibility', true);
        step('confirmation', true);
        const safety = await createBackup(db, 'safety', admin, 30);
        step('safety_backup', true, 'id' in safety ? safety.id : undefined);
        const { data: counts, error } = await db.rpc('restore_from_json', { p_payload: pkg.data });
        if (error) throw new Error(`Restore rolled back: ${error.message}`);
        step('restore_and_validate', true);
        await audit('backup_restored', r.id, { counts });
        await db.rpc('record_event', { p_event: crypto.randomUUID(), p_session: null, p_visitor: null, p_type: 'backup_restored', p_path: null, p_entity: r.id, p_details: { by: admin!.email }, p_status: 'success', p_ua: '' });
        return json(req, { ok: true, steps, counts });
      } catch (e) {
        step('failed', false, String((e as Error).message));
        await logSystemError(db, 'restore', e, { backupId: r.id });
        await db.rpc('record_event', { p_event: crypto.randomUUID(), p_session: null, p_visitor: null, p_type: 'backup_restored', p_path: null, p_entity: r.id, p_details: { error: String((e as Error).message).slice(0, 300) }, p_status: 'failed', p_ua: '' });
        return new Response(JSON.stringify({ ok: false, steps }), { status: 422, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } });
      }
    }
    return json(req, { error: 'unknown_action' }, 400);
  } catch (e) {
    await logSystemError(db, 'backup', e);
    return json(req, { error: 'server_error', detail: String((e as Error).message ?? e).slice(0, 200) }, 500);
  }
});
