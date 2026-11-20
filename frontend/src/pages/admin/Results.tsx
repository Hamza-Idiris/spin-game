import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { PAGE_SIZE, usePagedQuery } from '../../hooks/usePagedQuery';
import { DataTable } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { ResultView } from '../../components/ResultView';
import { Badge, JsonBlock, NotConfigured, PageTitle, fmt, short } from '../../components/admin/ui';
import { TOOLS } from '../../lib/engine';
import type { HistoryRecord } from '../../types';

export default function Results() {
  const { t, i18n } = useTranslation();
  const [tool, setTool] = useState('');
  const [open, setOpen] = useState<{ rec: HistoryRecord; exports: any[]; row: any } | null>(null);
  const d = usePagedQuery<any>({ table: 'spin_results', select: 'id,session_id,tool,config,output,participant_count,group_count,match_count,winner_count,created_at', filter: (q) => (tool ? q.eq('tool', tool) : q), deps: [tool] });

  const show = async (row: any) => {
    const [p, e] = await Promise.all([
      supabase!.from('spin_participants').select('name,position').eq('result_id', row.id).order('position'),
      supabase!.from('export_logs').select('id,format,status,created_at').eq('result_id', row.id).order('created_at', { ascending: false }),
    ]);
    setOpen({ row, exports: e.data ?? [], rec: { id: row.id, serverId: row.id, tool: row.tool, createdAt: row.created_at, participants: (p.data ?? []).map((x: any) => x.name), config: row.config, output: row.output } });
  };
  return (
    <div className="space-y-5">
      <PageTitle title={t('admin.results.title')} />
      <NotConfigured />
      <select className="input !w-56" value={tool} onChange={(e) => setTool(e.target.value)} aria-label={t('admin.results.tool')}><option value="">{t('admin.results.allTools')}</option>{TOOLS.map((x) => <option key={x} value={x}>{t(`tools.${x}.name`)}</option>)}</select>
      <DataTable rowKey={(r) => r.id} rows={d.rows} loading={d.loading} page={d.page} pageSize={PAGE_SIZE} total={d.total} onPage={d.setPage} onRow={show}
        cols={[
          { key: 'id', header: t('admin.table.id'), render: (r) => <code className="text-xs">{short(r.id)}</code> },
          { key: 'tool', header: t('admin.results.tool'), render: (r) => <span className="font-semibold">{t(`tools.${r.tool}.name`)}</span> },
          { key: 's', header: t('admin.table.session'), render: (r) => <code className="text-xs">{short(r.session_id)}</code> },
          { key: 'd', header: t('common.date'), render: (r) => fmt(r.created_at, i18n.language) },
          { key: 'p', header: t('admin.results.participants'), render: (r) => r.participant_count },
          { key: 'g', header: t('admin.results.groups'), render: (r) => r.group_count },
          { key: 'm', header: t('admin.results.matchups'), render: (r) => r.match_count },
          { key: 'w', header: t('admin.results.winners'), render: (r) => r.winner_count },
        ]} />
      <Modal wide open={!!open} onClose={() => setOpen(null)} title={t('admin.results.detail')}>
        {open && <div className="space-y-5">
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div><span className="text-muted">{t('admin.table.id')}: </span><code className="break-all text-xs">{open.row.id}</code></div>
            <div><span className="text-muted">{t('admin.table.session')}: </span><code className="break-all text-xs">{open.row.session_id ?? '—'}</code></div>
            <div><span className="text-muted">{t('common.date')}: </span>{fmt(open.row.created_at, i18n.language)}</div>
            <div><span className="text-muted">{t('admin.results.participants')}: </span>{open.row.participant_count}</div>
          </div>
          <ResultView rec={open.rec} />
          <div><h3 className="mb-2 text-sm font-bold">{t('report.participants')}</h3><div className="flex flex-wrap gap-1.5">{open.rec.participants.map((n, i) => <span key={i} className="chip">{n}</span>)}</div></div>
          <div><h3 className="mb-2 text-sm font-bold">{t('admin.results.exports')}</h3>{open.exports.length === 0 ? <p className="text-sm text-muted">—</p> : <ul className="space-y-1 text-sm">{open.exports.map((x) => <li key={x.id} className="flex items-center gap-3"><Badge value={x.format} /><Badge value={x.status} /><span className="text-xs text-muted">{fmt(x.created_at, i18n.language)}</span></li>)}</ul>}</div>
          <JsonBlock value={open.row.config} />
        </div>}
      </Modal>
    </div>
  );
}
