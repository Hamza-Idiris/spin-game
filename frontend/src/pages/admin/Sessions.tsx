import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { PAGE_SIZE, usePagedQuery } from '../../hooks/usePagedQuery';
import { DataTable } from '../../components/DataTable';
import { Modal } from '../../components/Modal';
import { Badge, NotConfigured, PageTitle, fmt, short } from '../../components/admin/ui';

const status = (s: any) => (!s.ended_at && Date.now() - new Date(s.last_activity_at).getTime() < 30 * 60 * 1000 ? 'active' : 'ended');

export default function Sessions() {
  const { t, i18n } = useTranslation();
  const [sel, setSel] = useState<any>(null);
  const [pages, setPages] = useState<any[]>([]);
  const d = usePagedQuery<any>({ table: 'visitor_sessions', select: 'id,visitor_id,created_at,last_activity_at,ended_at,page_count,spin_count,export_count', order: 'last_activity_at' });
  const open = async (s: any) => { setSel(s); const { data } = await supabase!.from('page_visits').select('id,path,created_at').eq('session_id', s.id).order('created_at').limit(200); setPages(data ?? []); };
  return (
    <div className="space-y-5">
      <PageTitle title={t('admin.sessions.title')} />
      <NotConfigured />
      <p className="text-xs text-muted">{t('admin.visitorsNote')}</p>
      <DataTable rowKey={(r) => r.id} rows={d.rows} loading={d.loading} page={d.page} pageSize={PAGE_SIZE} total={d.total} onPage={d.setPage} onRow={open}
        cols={[
          { key: 'id', header: t('admin.table.session'), render: (r) => <code className="text-xs">{short(r.id)}</code> },
          { key: 'c', header: t('admin.sessions.created'), render: (r) => fmt(r.created_at, i18n.language) },
          { key: 'l', header: t('admin.sessions.lastActivity'), render: (r) => fmt(r.last_activity_at, i18n.language) },
          { key: 'p', header: t('admin.sessions.pages'), render: (r) => r.page_count },
          { key: 's', header: t('admin.sessions.spins'), render: (r) => r.spin_count },
          { key: 'e', header: t('admin.sessions.exports'), render: (r) => r.export_count },
          { key: 'st', header: t('admin.table.status'), render: (r) => <Badge value={status(r)} label={t(`admin.sessions.${status(r)}`)} /> },
        ]} />
      <Modal open={!!sel} onClose={() => setSel(null)} title={t('admin.sessions.pagesVisited')}>
        {sel && <div className="space-y-3 text-sm"><code className="break-all text-xs">{sel.id}</code>
          {pages.length === 0 ? <p className="text-muted">—</p> : <ul className="divide-y divide-line">{pages.map((p) => <li key={p.id} className="flex justify-between gap-3 py-2"><span className="font-semibold">{p.path}</span><span className="text-xs text-muted">{fmt(p.created_at, i18n.language)}</span></li>)}</ul>}</div>}
      </Modal>
    </div>
  );
}
