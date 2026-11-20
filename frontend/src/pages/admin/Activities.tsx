import { useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { PAGE_SIZE, usePagedQuery } from '../../hooks/usePagedQuery';
import { DataTable } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { Badge, JsonBlock, NotConfigured, PageTitle, fmt, humanize, short } from '../../components/admin/ui';
import { exportTableExcel } from '../../lib/exporters';

export const ACTIVITY_TYPES = ['page_visit', 'session_start', 'session_end', 'spin_started', 'spin_completed', 'group_generated', 'teams_matched', 'winners_selected', 'export_pdf', 'export_excel', 'settings_changed', 'admin_login', 'admin_logout', 'backup_created', 'backup_failed', 'backup_restored', 'system_error'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function Activities() {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState(''); const [type, setType] = useState(''); const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [sel, setSel] = useState<any>(null);
  const filter = (q: any) => {
    if (type) q = q.eq('type', type);
    if (from) q = q.gte('created_at', new Date(from).toISOString());
    if (to) q = q.lte('created_at', new Date(new Date(to).getTime() + 86400000 - 1).toISOString());
    const s = search.trim();
    if (s) q = UUID.test(s) ? q.or(`id.eq.${s},session_id.eq.${s},entity_id.eq.${s}`) : q.ilike('type', `%${s.replace(/[%,()]/g, '')}%`);
    return q;
  };
  const d = usePagedQuery<any>({ table: 'activities', select: 'id,session_id,type,entity_id,status,details,created_at', filter, deps: [search, type, from, to] });

  const report = async () => {
    const { data } = await filter(supabase!.from('activities').select('id,session_id,type,entity_id,status,details,created_at')).order('created_at', { ascending: false }).limit(5000);
    await exportTableExcel(t('admin.activities.title'), ['ID', t('admin.table.session'), t('admin.table.type'), t('admin.table.entity'), t('admin.table.status'), t('admin.table.time'), t('admin.table.details')],
      (data ?? []).map((r: any) => [r.id, r.session_id ?? '', r.type, r.entity_id ?? '', r.status, new Date(r.created_at).toLocaleString(i18n.language), JSON.stringify(r.details)]));
  };
  return (
    <div className="space-y-5">
      <PageTitle title={t('admin.activities.title')}><button className="btn btn-sm" onClick={report} disabled={!supabase}><FileSpreadsheet size={15} />{t('admin.table.exportReport')}</button></PageTitle>
      <NotConfigured />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input className="input" placeholder={t('admin.table.search')} value={search} onChange={(e) => setSearch(e.target.value)} aria-label={t('common.search')} />
        <select className="input" value={type} onChange={(e) => setType(e.target.value)} aria-label={t('admin.table.type')}><option value="">{t('admin.table.allTypes')}</option>{ACTIVITY_TYPES.map((x) => <option key={x} value={x}>{humanize(x)}</option>)}</select>
        <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} aria-label={t('common.from')} />
        <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} aria-label={t('common.to')} />
      </div>
      <DataTable rowKey={(r) => r.id} rows={d.rows} loading={d.loading} page={d.page} pageSize={PAGE_SIZE} total={d.total} onPage={d.setPage} onRow={setSel}
        cols={[
          { key: 'id', header: t('admin.table.id'), render: (r) => <code className="text-xs">{short(r.id)}</code> },
          { key: 'type', header: t('admin.table.type'), render: (r) => <span className="font-semibold">{humanize(r.type)}</span> },
          { key: 'session', header: t('admin.table.session'), render: (r) => <code className="text-xs">{short(r.session_id)}</code> },
          { key: 'entity', header: t('admin.table.entity'), render: (r) => <code className="text-xs">{short(r.entity_id)}</code> },
          { key: 'status', header: t('admin.table.status'), render: (r) => <Badge value={r.status} label={t(`admin.activities.${r.status}`)} /> },
          { key: 'time', header: t('admin.table.time'), render: (r) => fmt(r.created_at, i18n.language) },
        ]} />
      {d.error && <p className="text-sm text-red-500">{d.error}</p>}
      <Modal open={!!sel} onClose={() => setSel(null)} title={sel ? humanize(sel.type) : ''}>
        {sel && <div className="space-y-3 text-sm">
          {([['id', sel.id], ['session', sel.session_id], ['entity', sel.entity_id], ['time', fmt(sel.created_at, i18n.language)]] as const).map(([k, v]) => <div key={k} className="flex justify-between gap-4"><span className="text-muted">{t(`admin.table.${k}`)}</span><code className="break-all text-xs">{v ?? '—'}</code></div>)}
          <div className="flex justify-between"><span className="text-muted">{t('admin.table.status')}</span><Badge value={sel.status} /></div>
          <JsonBlock value={sel.details} />
        </div>}
      </Modal>
    </div>
  );
}
