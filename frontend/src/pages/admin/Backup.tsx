import { useEffect, useState } from 'react';
import { AlertTriangle, DatabaseBackup, Download, Lock, RotateCcw, ShieldCheck, Trash2, Unlock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { callFunction, supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';
import { PAGE_SIZE, usePagedQuery } from '../../hooks/usePagedQuery';
import { DataTable } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { Badge, JsonBlock, NotConfigured, PageTitle, bytes, fmt, short } from '../../components/admin/ui';

const RET = [['30', 'days30'], ['90', 'days90'], ['180', 'days180'], ['365', 'days365'], ['indefinite', 'forever']] as const;

export default function Backup() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const d = usePagedQuery<any>({ table: 'backup_records', select: '*' });
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState<string[]>([]);
  const [detail, setDetail] = useState<any>(null);
  const [restore, setRestore] = useState<{ rec: any; info?: any; steps?: any[]; running?: boolean; confirm: string; done?: boolean } | null>(null);
  const [cfg, setCfg] = useState({ dailyEnabled: true, weeklyEnabled: true, retention: '90', notifyEmail: '' });
  const failed = d.rows.filter((r) => r.status === 'failed' && Date.now() - new Date(r.created_at).getTime() < 7 * 864e5);

  useEffect(() => {
    supabase?.from('backup_settings').select('*').eq('id', 1).maybeSingle().then(({ data }) => data && setCfg({ dailyEnabled: data.daily_enabled, weeklyEnabled: data.weekly_enabled, retention: data.retention_days ? String(data.retention_days) : 'indefinite', notifyEmail: data.notify_email ?? '' }));
  }, []);

  const call = (body: object) => callFunction<any>('backup', body, { auth: true });
  const create = async () => { setBusy(true); try { await call({ action: 'create' }); toast('success', t('common.saved')); } catch (e) { toast('error', (e as any).data?.detail ?? t('errors.generic')); } finally { setBusy(false); d.reload(); } };
  const download = async (r: any) => { try { const { url } = await call({ action: 'download', id: r.id }); window.location.href = url; } catch { toast('error', t('errors.generic')); } };
  const verify = async (r: any) => { try { const x = await call({ action: 'verify', id: r.id }); toast(x.integrity === 'verified' ? 'success' : 'error', t(x.integrity === 'verified' ? 'admin.backup.verifyOk' : 'admin.backup.verifyBad')); } catch { toast('error', t('errors.generic')); } d.reload(); };
  const del = async () => { if (!sel.length || !confirm(t('admin.backup.confirmDelete'))) return; try { await call({ action: 'delete', ids: sel }); toast('success', t('admin.backup.deleted')); setSel([]); } catch { toast('error', t('errors.generic')); } d.reload(); };
  const saveCfg = async () => { try { await call({ action: 'update_settings', dailyEnabled: cfg.dailyEnabled, weeklyEnabled: cfg.weeklyEnabled, retentionDays: cfg.retention === 'indefinite' ? null : Number(cfg.retention), notifyEmail: cfg.notifyEmail }); toast('success', t('admin.backup.settingsSaved')); } catch { toast('error', t('errors.generic')); } };

  const openRestore = async (rec: any) => {
    setRestore({ rec, confirm: '' });
    try { const info = await call({ action: 'inspect', id: rec.id }); setRestore({ rec, info, confirm: '' }); } catch { setRestore({ rec, info: { integrity: 'failed' }, confirm: '' }); }
    d.reload();
  };
  const runRestore = async () => {
    if (!restore) return; setRestore({ ...restore, running: true });
    try { const r = await call({ action: 'restore', id: restore.rec.id, confirm: restore.confirm }); setRestore((x) => x && { ...x, running: false, steps: r.steps, done: true }); toast('success', t('admin.backup.restored')); }
    catch (e) { const steps = (e as any).data?.steps ?? []; setRestore((x) => x && { ...x, running: false, steps }); toast('error', t('admin.backup.restoreFailed')); }
    d.reload();
  };
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const canRestore = restore?.info?.integrity === 'verified' && restore.info.compatible && restore.confirm === 'RESTORE' && !restore.running && !restore.done;

  return (
    <div className="space-y-6">
      <PageTitle title={t('admin.backup.title')}>
        {sel.length > 0 && <button className="btn btn-danger btn-sm" onClick={del}><Trash2 size={15} />{t('common.delete')} ({sel.length})</button>}
        <button className="btn btn-primary" onClick={create} disabled={busy || !supabase}><DatabaseBackup size={16} />{busy ? t('admin.backup.creating') : t('admin.backup.create')}</button>
      </PageTitle>
      <NotConfigured />
      {failed.length > 0 && <div className="card flex items-start gap-3 border-red-400/40 p-4 text-sm"><AlertTriangle className="mt-0.5 shrink-0 text-red-500" size={18} /><div><p className="font-bold">{t('admin.backup.failedBackup')}</p><p className="text-muted">{t('admin.backup.failedHint')}</p><p className="mt-1 text-xs text-red-500">{failed[0].error}</p></div></div>}

      <div className="card space-y-4 p-5">
        <h2 className="text-base font-extrabold">{t('admin.backup.schedule')}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex items-center justify-between gap-3 text-sm font-semibold"><span>{t('admin.backup.dailyOn')}</span><input type="checkbox" className="h-5 w-5 accent-[rgb(var(--primary))]" checked={cfg.dailyEnabled} onChange={(e) => setCfg({ ...cfg, dailyEnabled: e.target.checked })} /></label>
          <label className="flex items-center justify-between gap-3 text-sm font-semibold"><span>{t('admin.backup.weeklyOn')}</span><input type="checkbox" className="h-5 w-5 accent-[rgb(var(--primary))]" checked={cfg.weeklyEnabled} onChange={(e) => setCfg({ ...cfg, weeklyEnabled: e.target.checked })} /></label>
          <div><label className="label" htmlFor="ret">{t('admin.backup.retention')}</label><select id="ret" className="input" value={cfg.retention} onChange={(e) => setCfg({ ...cfg, retention: e.target.value })}>{RET.map(([v, k]) => <option key={v} value={v}>{t(`admin.backup.${k}`)}</option>)}</select></div>
          <div><label className="label" htmlFor="ne">{t('admin.backup.notifyEmail')}</label><input id="ne" type="email" className="input" value={cfg.notifyEmail} onChange={(e) => setCfg({ ...cfg, notifyEmail: e.target.value })} /></div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={saveCfg}>{t('common.save')}</button>
      </div>

      <div>
        <h2 className="mb-3 text-base font-extrabold">{t('admin.backup.history')}</h2>
        <DataTable rowKey={(r) => r.id} rows={d.rows} loading={d.loading} page={d.page} pageSize={PAGE_SIZE} total={d.total} onPage={d.setPage}
          cols={[
            { key: 'sel', header: '', render: (r) => <input type="checkbox" aria-label={t('admin.backup.selected')} className="h-4 w-4 accent-[rgb(var(--primary))]" checked={sel.includes(r.id)} onChange={() => toggle(r.id)} /> },
            { key: 'id', header: t('admin.table.id'), render: (r) => <button className="font-mono text-xs text-primary" onClick={() => setDetail(r)}>{short(r.id)}</button> },
            { key: 'kind', header: t('admin.backup.kind'), render: (r) => t(`admin.backup.${r.kind}`) },
            { key: 'size', header: t('admin.backup.size'), render: (r) => bytes(r.size_bytes) },
            { key: 'c', header: t('admin.backup.created'), render: (r) => fmt(r.created_at, i18n.language) },
            { key: 'st', header: t('common.status'), render: (r) => <Badge value={r.status} label={t(`admin.backup.${r.status}`)} /> },
            { key: 'loc', header: t('admin.backup.location'), render: (r) => <span className="inline-flex items-center gap-1 text-xs">{r.encrypted ? <Lock size={13} className="text-emerald-500" /> : <Unlock size={13} className="text-amber-500" />}{r.storage_location}</span> },
            { key: 'int', header: t('admin.backup.integrity'), render: (r) => <Badge value={r.integrity_status} label={t(`admin.backup.${r.integrity_status === 'failed' ? 'integrityFailed' : r.integrity_status}`)} /> },
            { key: 'act', header: '', render: (r) => r.status === 'completed' && (
              <div className="flex gap-1">
                <button className="btn btn-ghost !p-1.5" title={t('admin.backup.download')} aria-label={t('admin.backup.download')} onClick={() => download(r)}><Download size={15} /></button>
                <button className="btn btn-ghost !p-1.5" title={t('admin.backup.verifyNow')} aria-label={t('admin.backup.verifyNow')} onClick={() => verify(r)}><ShieldCheck size={15} /></button>
                <button className="btn btn-ghost !p-1.5" title={t('common.restore')} aria-label={t('common.restore')} onClick={() => openRestore(r)}><RotateCcw size={15} /></button>
              </div>) },
          ]} />
        {d.rows.length === 0 && !d.loading && <p className="mt-2 text-center text-sm text-muted">{t('admin.backup.none')}</p>}
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={t('admin.backup.detail')}>
        {detail && <div className="space-y-2 text-sm">
          {[['ID', detail.id], [t('admin.backup.kind'), t(`admin.backup.${detail.kind}`)], [t('admin.backup.size'), bytes(detail.size_bytes)], ['SHA-256', detail.checksum_sha256 ?? '—'], [t('admin.backup.location'), detail.storage_location], [t('admin.backup.schemaVersion'), detail.schema_version], [t('admin.backup.expires'), detail.expires_at ? fmt(detail.expires_at, i18n.language) : t('admin.backup.indefinite')], [t('admin.backup.encrypted'), detail.encrypted ? t('common.yes') : t('admin.backup.notEncrypted')]].map(([k, v]) => <div key={String(k)} className="flex justify-between gap-4"><span className="text-muted">{k}</span><span className="break-all text-end text-xs">{String(v)}</span></div>)}
          {detail.error && <p className="text-xs text-red-500">{detail.error}</p>}
          {detail.table_counts && <><h3 className="pt-2 text-sm font-bold">{t('admin.backup.contents')}</h3><JsonBlock value={detail.table_counts} /></>}
        </div>}
      </Modal>

      <Modal open={!!restore} onClose={() => !restore?.running && setRestore(null)} title={t('admin.backup.restoreTitle')} wide>
        {restore && <div className="space-y-4 text-sm">
          <p className="rounded-xl bg-amber-500/10 p-3 text-amber-700 dark:text-amber-300">{t('admin.backup.restoreWarn')}</p>
          {!restore.info ? <div className="skeleton h-24" /> : (<>
            <div className="flex items-center gap-2"><Badge value={restore.info.integrity === 'verified' ? 'verified' : 'failed'} label={t(restore.info.integrity === 'verified' ? 'admin.backup.verified' : 'admin.backup.integrityFailed')} />{restore.info.compatible === false && <span className="text-xs text-red-500">{restore.info.compatibilityError}</span>}{restore.info.error && <span className="text-xs text-red-500">{restore.info.error}</span>}</div>
            {restore.info.manifest && <JsonBlock value={restore.info.manifest} />}
          </>)}
          {restore.steps && <ul className="space-y-1">{restore.steps.map((s, i) => <li key={i} className={`flex items-center gap-2 ${s.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>{s.ok ? '✓' : '✗'} {t(`admin.backup.step.${s.step}`)}{s.detail && !s.ok ? ` — ${s.detail}` : ''}</li>)}</ul>}
          {!restore.done && <div><label className="label" htmlFor="rc">{t('admin.backup.typeRestore')}</label><input id="rc" className="input" autoComplete="off" value={restore.confirm} onChange={(e) => setRestore({ ...restore, confirm: e.target.value })} /></div>}
          <div className="flex justify-end gap-2"><button className="btn" disabled={restore.running} onClick={() => setRestore(null)}>{t('common.close')}</button>{!restore.done && <button className="btn btn-danger" disabled={!canRestore} onClick={runRestore}>{restore.running ? t('admin.backup.restoring') : t('common.restore')}</button>}</div>
        </div>}
      </Modal>
    </div>
  );
}
