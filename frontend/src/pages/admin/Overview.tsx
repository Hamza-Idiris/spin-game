import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { Badge, NotConfigured, PageTitle, StatCard, fmt, humanize, short, useChartColors } from '../../components/admin/ui';

export default function Overview() {
  const { t, i18n } = useTranslation();
  const c = useChartColors();
  const [o, setO] = useState<any>(null);
  const [series, setSeries] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    (async () => {
      const [a, b, r] = await Promise.all([
        supabase!.rpc('admin_overview'), supabase!.rpc('admin_timeseries', { p_bucket: 'day', p_count: 30 }),
        supabase!.from('activities').select('id,type,status,created_at,session_id').order('created_at', { ascending: false }).limit(8),
      ]);
      setO(a.data); setSeries((b.data ?? []).map((x: any) => ({ ...x, label: x.bucket.slice(5) }))); setRecent(r.data ?? []); setLoading(false);
    })();
  }, []);

  const cards: [string, number | undefined][] = [
    ['visitors', o?.visitors], ['sessions', o?.sessions], ['active', o?.activeSessions], ['spins', o?.spins], ['groups', o?.groups],
    ['matchups', o?.matchups], ['winners', o?.winners], ['pdf', o?.pdfExports], ['excel', o?.excelExports],
  ];
  return (
    <div className="space-y-6">
      <PageTitle title={t('admin.nav.overview')} />
      <NotConfigured />
      {o?.failedBackups7d > 0 && <Link to="/admin/backup" className="card flex items-center gap-3 border-red-400/40 p-4 text-sm"><AlertTriangle className="text-red-500" size={18} />{t('admin.failedBackups', { count: o.failedBackups7d })}</Link>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{cards.map(([k, v]) => <StatCard key={k} label={t(`admin.cards.${k}`)} value={v ?? 0} loading={loading} />)}</div>
      <p className="text-xs text-muted">{t('admin.visitorsNote')}</p>
      <div className="card p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-bold">{t('admin.charts.daily')}</h2>
        <div className="h-72"><ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series}><defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c.primary} stopOpacity={0.35} /><stop offset="1" stopColor={c.primary} stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid stroke={c.line} strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" stroke={c.muted} fontSize={11} tickLine={false} /><YAxis stroke={c.muted} fontSize={11} allowDecimals={false} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: c.surface, border: `1px solid ${c.line}`, borderRadius: 12, color: c.ink }} />
            <Area type="monotone" dataKey="activities" name={t('admin.charts.activities')} stroke={c.primary} fill="url(#ga)" strokeWidth={2} />
            <Area type="monotone" dataKey="spins" name={t('admin.charts.spins')} stroke={c.accent} fill="none" strokeWidth={2} />
          </AreaChart></ResponsiveContainer></div>
      </div>
      <div className="card p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold">{t('admin.recent')}</h2><Link to="/admin/activities" className="text-xs font-semibold text-primary">{t('common.all')}</Link></div>
        {recent.length === 0 ? <p className="py-6 text-center text-sm text-muted">{t('admin.table.noRows')}</p> : <ul className="divide-y divide-line">{recent.map((r) => <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-sm"><span className="font-semibold">{humanize(r.type)}</span><span className="hidden text-xs text-muted sm:inline">{short(r.session_id)}</span><Badge value={r.status} /><span className="text-xs text-muted">{fmt(r.created_at, i18n.language)}</span></li>)}</ul>}
      </div>
    </div>
  );
}
