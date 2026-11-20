import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Copy, FileSpreadsheet, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ToolGrid } from '../../components/ToolGrid';
import { clearHistory, deleteHistory, listHistory } from '../../lib/history';
import { exportExcel, exportPdf, resultToText } from '../../lib/exporters';
import { useSettings } from '../../hooks/useSettings';
import { useToast } from '../../hooks/useToast';
import { track } from '../../lib/tracker';
import type { HistoryRecord } from '../../types';

export default function Tools() {
  const { t, i18n } = useTranslation();
  const { settings } = useSettings();
  const toast = useToast();
  const [items, setItems] = useState<HistoryRecord[]>(listHistory);
  const brand = settings.general.name;
  const copy = async (r: HistoryRecord) => { await navigator.clipboard.writeText(resultToText(r, t)); toast('success', t('common.copied')); };
  const summary = (r: HistoryRecord) => r.output.winners ? r.output.winners.join(', ') : r.output.groups ? t('groups.summary', { groups: r.output.groups.length, people: r.participants.length }) : `${r.output.matches?.length ?? 0} ${t('report.matchups')}`;

  return (
    <div className="page-in mx-auto max-w-6xl space-y-12 px-4 py-10">
      <ToolGrid />
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">{t('history.title')}</h2>
          {items.length > 0 && <button className="btn btn-ghost btn-sm text-red-500" onClick={() => { if (confirm(t('history.confirmClear'))) { clearHistory(); setItems([]); } }}><Trash2 size={15} />{t('history.clearAll')}</button>}
        </div>
        {items.length === 0 ? <div className="card p-8 text-center text-sm text-muted">{t('history.empty')}</div> : (
          <ul className="space-y-2.5">
            {items.slice(0, 30).map((r) => (
              <li key={r.id} className="card flex flex-wrap items-center gap-3 px-4 py-3">
                <Link to={`/result/${r.id}`} className="min-w-0 flex-1">
                  <div className="text-sm font-bold">{t(`tools.${r.tool}.name`)}</div>
                  <div className="truncate text-xs text-muted">{new Date(r.createdAt).toLocaleString(i18n.language)} · {summary(r)}</div>
                </Link>
                <div className="flex gap-1">
                  <button className="btn btn-ghost !p-2" aria-label={t('common.copy')} onClick={() => copy(r)}><Copy size={16} /></button>
                  {settings.features.excel && <button className="btn btn-ghost !p-2" aria-label="Excel" onClick={() => { exportExcel(r, t, brand, i18n.language); track('export_excel', { entityId: r.serverId }); }}><FileSpreadsheet size={16} /></button>}
                  {settings.features.pdf && <button className="btn btn-ghost !p-2" aria-label="PDF" onClick={() => { exportPdf(r, t, brand, i18n.language); track('export_pdf', { entityId: r.serverId }); }}><FileText size={16} /></button>}
                  <button className="btn btn-ghost !p-2 text-red-500" aria-label={t('common.delete')} onClick={() => { deleteHistory(r.id); setItems(listHistory()); toast('info', t('history.deleted')); }}><Trash2 size={16} /></button>
                </div>
              </li>))}
          </ul>)}
      </section>
    </div>
  );
}
