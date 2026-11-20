import { Copy, FileSpreadsheet, FileText, Printer, RotateCcw, Shuffle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { HistoryRecord } from '../types';
import { exportExcel, exportPdf, printReport, resultToText } from '../lib/exporters';
import { useSettings } from '../hooks/useSettings';
import { useToast } from '../hooks/useToast';
import { track } from '../lib/tracker';

export function ResultActions({ rec, onRegenerate, onReset, regenerateLabel }: { rec: HistoryRecord; onRegenerate?: () => void; onReset?: () => void; regenerateLabel?: string }) {
  const { t, i18n } = useTranslation();
  const { settings } = useSettings();
  const toast = useToast();
  const brand = settings.general.name || 'SPIN';

  const copy = async () => { try { await navigator.clipboard.writeText(resultToText(rec, t)); toast('success', t('common.copied')); } catch { toast('error', t('errors.generic')); } };
  const doExport = async (kind: 'excel' | 'pdf') => {
    try {
      if (kind === 'excel') await exportExcel(rec, t, brand, i18n.language); else await exportPdf(rec, t, brand, i18n.language);
      track(kind === 'excel' ? 'export_excel' : 'export_pdf', { entityId: rec.serverId });
    } catch { toast('error', t('errors.generic')); track(kind === 'excel' ? 'export_excel' : 'export_pdf', { entityId: rec.serverId, status: 'failed' }); }
  };
  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      {onRegenerate && <button className="btn btn-primary btn-sm" onClick={onRegenerate}><Shuffle size={15} />{regenerateLabel ?? t('common.regenerate')}</button>}
      <button className="btn btn-sm" onClick={copy}><Copy size={15} />{t('result.copyText')}</button>
      {settings.features.excel && <button className="btn btn-sm" onClick={() => doExport('excel')}><FileSpreadsheet size={15} />{t('result.excel')}</button>}
      {settings.features.pdf && <button className="btn btn-sm" onClick={() => doExport('pdf')}><FileText size={15} />{t('result.pdf')}</button>}
      <button className="btn btn-sm" onClick={() => printReport(rec, t, brand)}><Printer size={15} />{t('common.print')}</button>
      {onReset && <button className="btn btn-ghost btn-sm" onClick={onReset}><RotateCcw size={15} />{t('common.reset')}</button>}
      {rec.local && <span className="text-xs text-muted">{t('result.local')}</span>}
    </div>
  );
}
