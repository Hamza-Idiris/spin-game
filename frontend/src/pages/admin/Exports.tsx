import { useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { PAGE_SIZE, usePagedQuery } from '../../hooks/usePagedQuery';
import { DataTable } from '../../components/DataTable';
import { Badge, NotConfigured, PageTitle, fmt, short } from '../../components/admin/ui';
import { exportTableExcel } from '../../lib/exporters';

export default function Exports() {
  const { t, i18n } = useTranslation();
  const [format, setFormat] = useState(''); const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const filter = (q: any) => { if (format) q = q.eq('format', format); if (from) q = q.gte('created_at', new Date(from).toISOString()); if (to) q = q.lte('created_at', new Date(new Date(to).getTime() + 86399999).toISOString()); return q; };
  const d = usePagedQuery<any>({ table: 'export_logs', select: 'id,format,result_id,session_id,status,created_at', filter, deps: [format, from, to] });
  const report = async () => {
    const { data } = await filter(supabase!.from('export_logs').select('id,format,result_id,session_id,status,created_at')).order('created_at', { ascending: false }).limit(5000);
    await exportTableExcel(t('admin.exports.title'), ['ID', t('admin.exports.format'), t('admin.exports.result'), t('admin.table.session'), t('admin.table.status'), t('admin.exports.created')], (data ?? []).map((r: any) => [r.id, r.format, r.result_id ?? '', r.session_id ?? '', r.status, new Date(r.created_at).toLocaleString(i18n.language)]));
  };
  return (
    <div className="space-y-5">
      <PageTitle title={t('admin.exports.title')}><button className="btn btn-sm" onClick={report} disabled={!supabase}><FileSpreadsheet size={15} />{t('admin.table.exportReport')}</button></PageTitle>
      <NotConfigured />
      <div className="grid gap-3 sm:grid-cols-3">
        <select className="input" value={format} onChange={(e) => setFormat(e.target.value)} aria-label={t('admin.exports.format')}><option value="">{t('admin.exports.allFormats')}</option><option value="pdf">PDF</option><option value="excel">Excel</option></select>
        <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} aria-label={t('common.from')} />
        <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} aria-label={t('common.to')} />
      </div>
      <DataTable rowKey={(r) => r.id} rows={d.rows} loading={d.loading} page={d.page} pageSize={PAGE_SIZE} total={d.total} onPage={d.setPage}
        cols={[
          { key: 'id', header: t('admin.table.id'), render: (r) => <code className="text-xs">{short(r.id)}</code> },
          { key: 'f', header: t('admin.exports.format'), render: (r) => <Badge value={r.format} label={r.format.toUpperCase()} /> },
          { key: 'r', header: t('admin.exports.result'), render: (r) => <code className="text-xs">{short(r.result_id)}</code> },
          { key: 's', header: t('admin.table.session'), render: (r) => <code className="text-xs">{short(r.session_id)}</code> },
          { key: 'c', header: t('admin.exports.created'), render: (r) => fmt(r.created_at, i18n.language) },
          { key: 'st', header: t('admin.table.status'), render: (r) => <Badge value={r.status} /> },
        ]} />
    </div>
  );
}
