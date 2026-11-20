import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';

export interface Col<T> { key: string; header: string; render: (row: T) => ReactNode; className?: string }

export function DataTable<T>({ cols, rows, loading, page, pageSize, total, onPage, onRow, rowKey }: {
  cols: Col<T>[]; rows: T[]; loading?: boolean; page: number; pageSize: number; total: number; onPage: (p: number) => void; onRow?: (r: T) => void; rowKey: (r: T) => string;
}) {
  const { t } = useTranslation();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="border-b border-line bg-surface2/60"><tr>{cols.map((c) => <th key={c.key} className="th">{c.header}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">
            {loading && Array.from({ length: 6 }, (_, i) => <tr key={i}><td colSpan={cols.length} className="px-4 py-3"><div className="skeleton h-5" /></td></tr>)}
            {!loading && rows.length === 0 && <tr><td colSpan={cols.length} className="px-4 py-12 text-center text-sm text-muted">{t('admin.table.noRows')}</td></tr>}
            {!loading && rows.map((r) => (
              <tr key={rowKey(r)} onClick={() => onRow?.(r)} className={onRow ? 'cursor-pointer transition hover:bg-surface2/60' : ''}>
                {cols.map((c) => <td key={c.key} className={`td ${c.className ?? ''}`}>{c.render(r)}</td>)}
              </tr>))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-xs text-muted">
        <span>{total} {t('admin.table.rows')}</span>
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost btn-sm !p-1.5" disabled={page <= 0} onClick={() => onPage(page - 1)} aria-label={t('common.previous')}><ChevronLeft size={16} /></button>
          <span>{t('common.page')} {page + 1} {t('common.of')} {pages}</span>
          <button className="btn btn-ghost btn-sm !p-1.5" disabled={page + 1 >= pages} onClick={() => onPage(page + 1)} aria-label={t('common.next')}><ChevronRight size={16} /></button>
        </div>
      </div>
    </div>
  );
}
