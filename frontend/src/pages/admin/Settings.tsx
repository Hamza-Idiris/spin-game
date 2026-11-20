import { useEffect, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { callFunction, supabase } from '../../lib/supabase';
import { useSettings } from '../../hooks/useSettings';
import { useToast } from '../../hooks/useToast';
import { NotConfigured, PageTitle } from '../../components/admin/ui';
import { newId } from '../../lib/session';

function Section({ title, children, onSubmit, saving }: { title: string; children: ReactNode; onSubmit: () => void; saving: boolean }) {
  const { t } = useTranslation();
  return <form onSubmit={onSubmit} className="card space-y-4 p-5" noValidate><h2 className="text-base font-extrabold">{title}</h2>{children}<button className="btn btn-primary btn-sm" disabled={saving}>{t('common.save')}</button></form>;
}
const Err = ({ m }: { m?: string }) => (m ? <p className="mt-1 text-xs text-red-500">{m}</p> : null);
function Switch({ label, reg }: { label: string; reg: object }) {
  return <label className="flex cursor-pointer items-center justify-between gap-4 text-sm font-semibold"><span>{label}</span><input type="checkbox" className="h-5 w-5 accent-[rgb(var(--primary))]" {...reg} /></label>;
}

function useSave(key: string) {
  const { t } = useTranslation(); const toast = useToast(); const { reload } = useSettings(); const [saving, setSaving] = useState(false);
  const save = async (value: object) => {
    setSaving(true);
    try { await callFunction('admin-api', { action: 'settings_update', key, value }, { auth: true }); toast('success', t('admin.settings.saved')); await reload(); }
    catch (e) { toast('error', `${t('errors.generic')} (${(e as any).data?.detail ?? (e as Error).message})`); }
    finally { setSaving(false); }
  };
  return { save, saving };
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const { settings } = useSettings();
  return (
    <div className="space-y-5">
      <PageTitle title={t('admin.settings.title')} />
      <NotConfigured />
      <General v={settings.general} /><Tools v={settings.tools} /><Appearance v={settings.appearance} /><Features v={settings.features} /><System v={settings.system} />
    </div>
  );
}

function General({ v }: { v: any }) {
  const { t } = useTranslation(); const toast = useToast(); const { save, saving } = useSave('general');
  const url = z.string().refine((s) => s === '' || /^https:\/\//.test(s), t('validation.https'));
  const schema = z.object({ name: z.string().min(1, t('validation.required')).max(60), logoUrl: url, faviconUrl: url, description: z.string().max(200), headline: z.string().min(1, t('validation.required')).max(80), subtitle: z.string().max(160) });
  const f = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), values: v });
  const upload = async (file: File, field: 'logoUrl' | 'faviconUrl') => {
    if (!supabase || file.size > 1024 * 1024 || !/^image\//.test(file.type)) { toast('error', t('errors.generic')); return; }
    const path = `${field}-${newId()}.${file.name.split('.').pop()?.replace(/\W/g, '') || 'png'}`;
    const { error } = await supabase.storage.from('branding').upload(path, file, { contentType: file.type });
    if (error) { toast('error', error.message); return; }
    f.setValue(field, supabase.storage.from('branding').getPublicUrl(path).data.publicUrl, { shouldDirty: true });
  };
  const field = (k: keyof z.infer<typeof schema>, label: string, multiline = false) => (<div key={k}><label className="label" htmlFor={`g-${k}`}>{label}</label>{multiline ? <textarea id={`g-${k}`} rows={2} className="input" {...f.register(k)} /> : <input id={`g-${k}`} className="input" {...f.register(k)} />}<Err m={f.formState.errors[k]?.message} /></div>);
  return (
    <Section title={t('admin.settings.general')} saving={saving} onSubmit={f.handleSubmit(save)}>
      {field('name', t('admin.settings.name'))}
      {(['logoUrl', 'faviconUrl'] as const).map((k) => (<div key={k}>{field(k, t(`admin.settings.${k === 'logoUrl' ? 'logo' : 'favicon'}`))}
        <label className="btn btn-sm mt-2 cursor-pointer">{t('admin.settings.upload')}<input type="file" accept="image/*" hidden onChange={(e) => { const x = e.target.files?.[0]; if (x) upload(x, k); e.target.value = ''; }} /></label></div>))}
      {field('description', t('admin.settings.description'), true)}{field('headline', t('admin.settings.headline'))}{field('subtitle', t('admin.settings.subtitle'))}
    </Section>
  );
}

function Tools({ v }: { v: any }) {
  const { t } = useTranslation(); const { save, saving } = useSave('tools');
  const f = useForm({ values: v });
  return <Section title={t('admin.settings.tools')} saving={saving} onSubmit={f.handleSubmit(save)}>{(['wheel', 'teams', 'groups', 'groupspin', 'select'] as const).map((k) => <Switch key={k} label={t(`tools.${k}.name`)} reg={f.register(k)} />)}</Section>;
}

function Appearance({ v }: { v: any }) {
  const { t } = useTranslation(); const { save, saving } = useSave('appearance');
  const schema = z.object({ defaultTheme: z.enum(['system', 'light', 'dark']), allowLight: z.boolean(), allowDark: z.boolean(), primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, t('validation.color')) })
    .refine((x) => x.allowLight || x.allowDark, { path: ['allowLight'], message: t('admin.settings.oneThemeRequired') });
  const f = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), values: v });
  return (
    <Section title={t('admin.settings.appearance')} saving={saving} onSubmit={f.handleSubmit(save)}>
      <div><label className="label" htmlFor="dt">{t('admin.settings.defaultTheme')}</label><select id="dt" className="input" {...f.register('defaultTheme')}><option value="system">{t('admin.settings.themeSystem')}</option><option value="light">{t('common.light')}</option><option value="dark">{t('common.dark')}</option></select></div>
      <Switch label={t('admin.settings.allowLight')} reg={f.register('allowLight')} /><Switch label={t('admin.settings.allowDark')} reg={f.register('allowDark')} /><Err m={f.formState.errors.allowLight?.message} />
      <div><label className="label" htmlFor="pc">{t('admin.settings.primaryColor')}</label><div className="flex items-center gap-3"><input type="color" className="h-10 w-14 cursor-pointer rounded-lg border border-line bg-surface p-1" value={f.watch('primaryColor') ?? '#6C5CE7'} onChange={(e) => f.setValue('primaryColor', e.target.value, { shouldDirty: true })} aria-label={t('admin.settings.primaryColor')} /><input id="pc" className="input !w-36" {...f.register('primaryColor')} /></div><Err m={f.formState.errors.primaryColor?.message} /></div>
    </Section>
  );
}

function Features({ v }: { v: any }) {
  const { t } = useTranslation(); const { save, saving } = useSave('features');
  const f = useForm({ values: v });
  return <Section title={t('admin.settings.features')} saving={saving} onSubmit={f.handleSubmit(save)}>{(['sound', 'animations', 'excel', 'pdf'] as const).map((k) => <Switch key={k} label={t(`admin.settings.${k}`)} reg={f.register(k)} />)}</Section>;
}

function System({ v }: { v: any }) {
  const { t } = useTranslation(); const { save, saving } = useSave('system');
  const n = (lo: number, hi: number) => z.coerce.number({ invalid_type_error: t('validation.number') }).int(t('validation.number')).min(lo, t('validation.range')).max(hi, t('validation.range'));
  const schema = z.object({ maintenance: z.boolean(), activityRetentionDays: n(0, 3650), sessionRetentionDays: n(0, 3650), resultsRetentionDays: n(0, 3650), maxParticipants: n(2, 5000), maxNameLength: n(1, 200) });
  const f = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), values: v });
  const nums = ['activityRetentionDays', 'sessionRetentionDays', 'resultsRetentionDays', 'maxParticipants', 'maxNameLength'] as const;
  return (
    <Section title={t('admin.settings.system')} saving={saving} onSubmit={f.handleSubmit(save)}>
      <Switch label={t('admin.settings.maintenance')} reg={f.register('maintenance')} />
      <div className="grid gap-4 sm:grid-cols-2">{nums.map((k) => <div key={k}><label className="label" htmlFor={`s-${k}`}>{t(`admin.settings.${k}`)}</label><input id={`s-${k}`} type="number" className="input" {...f.register(k)} /><Err m={f.formState.errors[k]?.message} /></div>)}</div>
    </Section>
  );
}
