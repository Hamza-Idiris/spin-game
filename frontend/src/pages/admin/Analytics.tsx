import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { NotConfigured, PageTitle, useChartColors } from '../../components/admin/ui';

export default function Analytics() {
  const { t } = useTranslation();
  const c = useChartColors();
  const [weekly, setWeekly] = useState<any[]>([]); const [monthly, setMonthly] = useState<any[]>([]); const [daily, setDaily] = useState<any[]>([]); const [o, setO] = useState<any>(null);
  useEffect(() => {
    if (!supabase) return;
    const lab = (x: any) => ({ ...x, label: x.bucket.slice(5) });
    supabase.rpc('admin_timeseries', { p_bucket: 'week', p_count: 12 }).then((r) => setWeekly((r.data ?? []).map(lab)));
    supabase.rpc('admin_timeseries', { p_bucket: 'month', p_count: 12 }).then((r) => setMonthly((r.data ?? []).map((x: any) => ({ ...x, label: x.bucket.slice(0, 7) }))));
    supabase.rpc('admin_timeseries', { p_bucket: 'day', p_count: 30 }).then((r) => setDaily((r.data ?? []).map(lab)));
    supabase.rpc('admin_overview').then((r) => setO(r.data));
  }, []);
  const tip = { contentStyle: { background: c.surface, border: `1px solid ${c.line}`, borderRadius: 12, color: c.ink } };
  const axes = <><CartesianGrid stroke={c.line} strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" stroke={c.muted} fontSize={11} tickLine={false} /><YAxis stroke={c.muted} fontSize={11} allowDecimals={false} tickLine={false} axisLine={false} /><Tooltip {...tip} /><Legend /></>;
  const dist = Object.entries(o?.toolDistribution ?? {}).map(([k, v]) => ({ name: t(`tools.${k}.name`), value: Number(v) }));
  const exp = [{ name: 'PDF', value: o?.pdfExports ?? 0 }, { name: 'Excel', value: o?.excelExports ?? 0 }];
  const pal = [c.primary, c.accent, c.secondary, '#F472B6', '#34D399'];
  const Box = ({ title, children }: { title: string; children: React.ReactNode }) => <div className="card p-4 sm:p-5"><h2 className="mb-4 text-sm font-bold">{title}</h2><div className="h-64">{children}</div></div>;
  return (
    <div className="space-y-5">
      <PageTitle title={t('admin.analytics.title')} />
      <NotConfigured />
      <div className="grid gap-5 lg:grid-cols-2">
        <Box title={t('admin.charts.weekly')}><ResponsiveContainer><BarChart data={weekly}>{axes}<Bar dataKey="activities" name={t('admin.charts.activities')} fill={c.primary} radius={[6, 6, 0, 0]} /><Bar dataKey="spins" name={t('admin.charts.spins')} fill={c.accent} radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></Box>
        <Box title={t('admin.charts.monthly')}><ResponsiveContainer><BarChart data={monthly}>{axes}<Bar dataKey="activities" name={t('admin.charts.activities')} fill={c.primary} radius={[6, 6, 0, 0]} /><Bar dataKey="spins" name={t('admin.charts.spins')} fill={c.accent} radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></Box>
        <Box title={t('admin.charts.distribution')}>{dist.length === 0 ? <p className="grid h-full place-items-center text-sm text-muted">{t('admin.table.noRows')}</p> : <ResponsiveContainer><PieChart><Pie data={dist} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3}>{dist.map((_, i) => <Cell key={i} fill={pal[i % pal.length]} stroke="none" />)}</Pie><Tooltip {...tip} /><Legend /></PieChart></ResponsiveContainer>}</Box>
        <Box title={t('admin.charts.exports')}><ResponsiveContainer><BarChart data={exp}><CartesianGrid stroke={c.line} strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" stroke={c.muted} fontSize={12} tickLine={false} /><YAxis stroke={c.muted} fontSize={11} allowDecimals={false} tickLine={false} axisLine={false} /><Tooltip {...tip} /><Bar dataKey="value" name={t('admin.charts.exportsLabel')} radius={[8, 8, 0, 0]}>{exp.map((_, i) => <Cell key={i} fill={pal[i]} />)}</Bar></BarChart></ResponsiveContainer></Box>
      </div>
      <Box title={t('admin.charts.visitors')}><ResponsiveContainer><LineChart data={daily}>{axes}<Line type="monotone" dataKey="sessions" name={t('admin.charts.sessions')} stroke={c.primary} strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></Box>
      <p className="text-xs text-muted">{t('admin.visitorsNote')}</p>
    </div>
  );
}
