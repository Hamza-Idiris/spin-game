// Admin-only endpoint. Authorization is verified server-side against admin_users.
import { json, preflight } from '../_shared/cors.ts';
import { requireAdmin, serviceClient, logSystemError } from '../_shared/clients.ts';
import { validateSetting } from '../_shared/settings.ts';

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  if (req.method !== 'POST') return json(req, { error: 'method_not_allowed' }, 405);
  const db = serviceClient();
  try {
    const admin = await requireAdmin(req, db);
    if (!admin) return json(req, { error: 'forbidden' }, 403);
    const b = await req.json().catch(() => null);
    if (!b) return json(req, { error: 'bad_request' }, 400);

    if (b.action === 'log_auth') {
      if (b.event !== 'login' && b.event !== 'logout') return json(req, { error: 'bad_request' }, 400);
      await db.from('admin_activity_logs').insert({ admin_id: admin.id, admin_email: admin.email, action: `admin_${b.event}` });
      await db.rpc('record_event', { p_event: crypto.randomUUID(), p_session: null, p_visitor: null, p_type: `admin_${b.event}`, p_path: null, p_entity: null, p_details: { admin: admin.email }, p_status: 'success', p_ua: req.headers.get('user-agent') ?? '' });
      return json(req, { ok: true });
    }

    if (b.action === 'settings_update') {
      const err = validateSetting(String(b.key), b.value);
      if (err) return json(req, { error: 'validation_failed', detail: err }, 400);
      const { data: prev } = await db.from('website_settings').select('value').eq('key', b.key).maybeSingle();
      const { error } = await db.from('website_settings').upsert({ key: b.key, value: b.value, updated_at: new Date().toISOString(), updated_by: admin.id });
      if (error) throw error;
      await db.from('admin_activity_logs').insert({ admin_id: admin.id, admin_email: admin.email, action: 'settings_changed', target: b.key, previous: prev?.value ?? null, new: b.value });
      await db.rpc('record_event', { p_event: crypto.randomUUID(), p_session: null, p_visitor: null, p_type: 'settings_changed', p_path: null, p_entity: null, p_details: { key: b.key, admin: admin.email }, p_status: 'success', p_ua: '' });
      return json(req, { ok: true });
    }
    return json(req, { error: 'unknown_action' }, 400);
  } catch (e) {
    await logSystemError(db, 'admin-api', e);
    return json(req, { error: 'server_error' }, 500);
  }
});
