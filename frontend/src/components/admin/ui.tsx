import { useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { isConfigured } from '../../lib/supabase';

export const short = (id?: string | null) => (id ? id.slice(0, 8) : '—');
export const humanize = (s: string) => s.replace(/_/g, ' ');
export const fmt = (d?: string | null, lng = 'en') => (d ? new Date(d).toLocaleString(lng, { dateStyle: 'medium', timeStyle: 'short' }) : '—');
export const bytes = (n?: number | null) => { if (!n) return '—'; const u = ['B', 'KB', 'MB', 'GB']; let i = 0; let v = n; while (v >= 1024 && i < 3) { v /= 1024; i++; } return `${v.toFixed(i ? 1 : 0)} ${u[i]}`; };

export function PageTitle({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-extrabold tracking-tight">{title}</h1><div className="flex flex-wrap items-center gap-2">{children}</div></div>;
}

export function NotConfigured() {
  const { t } = useTranslation();
  if (isConfigured) return null;
  return <div className="card mb-6 flex items-start gap-3 border-amber-400/40 p-4 text-sm"><AlertTriangle className="mt-0.5 shrink-0 text-amber-500" size={18} />{t('admin.notConfigured')}</div>;
}

export function StatCard({ label, value, loading }: { label: string; value: number | string; loading?: boolean }) {
  return <div className="card p-4"><div className="text-xs font-semibold text-muted">{label}</div>{loading ? <div className="skeleton mt-2 h-8 w-16" /> : <div className="mt-1 text-2xl font-extrabold tabular-nums">{value}</div>}</div>;
}

const TONE: Record<string, string> = { success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', completed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', verified: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', failed: 'bg-red-500/10 text-red-600 dark:text-red-400', running: 'bg-amber-500/10 text-amber-600', info: 'bg-accent/10 text-accent', active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', ended: 'bg-surface2 text-muted', unverified: 'bg-surface2 text-muted', generated: 'bg-surface2 text-muted' };
export function Badge({ value, label }: { value: string; label?: string }) { return <span className={`badge ${TONE[value] ?? 'bg-primary/10 text-primary'}`}>{label ?? humanize(value)}</span>; }

export function JsonBlock({ value }: { value: unknown }) {
  return <pre className="max-h-72 overflow-auto rounded-xl bg-surface2 p-3 text-xs leading-relaxed">{JSON.stringify(value, null, 2)}</pre>;
}

/** Reads the live CSS theme variables so Recharts colors follow Light/Dark mode. */
export function useChartColors() {
  const read = () => { const s = getComputedStyle(document.documentElement); const c = (v: string) => `rgb(${s.getPropertyValue(v).trim().split(' ').join(',')})`; return { primary: c('--primary'), accent: c('--accent'), secondary: c('--secondary'), muted: c('--muted'), line: c('--line'), surface: c('--surface'), ink: c('--ink') }; };
  const [v, setV] = useState(read);
  useEffect(() => { const o = new MutationObserver(() => setV(read())); o.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] }); return () => o.disconnect(); }, []);
  return v;
}
