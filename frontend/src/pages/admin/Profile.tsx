import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { supabase } from '../../lib/supabase';
import { NotConfigured, PageTitle } from '../../components/admin/ui';

export default function Profile() {
  const { t } = useTranslation();
  const { session, signOut } = useAuth();
  const toast = useToast();
  const schema = z.object({ password: z.string().min(8, t('validation.passwordMin')), confirm: z.string() }).refine((v) => v.password === v.confirm, { path: ['confirm'], message: t('validation.match') });
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const submit = handleSubmit(async ({ password }) => {
    const { error } = await supabase!.auth.updateUser({ password });
    if (error) toast('error', error.message); else { toast('success', t('admin.profile.passwordUpdated')); reset(); }
  });
  return (
    <div className="max-w-xl space-y-5">
      <PageTitle title={t('admin.profile.title')} />
      <NotConfigured />
      <div className="card space-y-3 p-5 text-sm">
        <div className="flex justify-between"><span className="text-muted">{t('admin.profile.email')}</span><span className="font-semibold">{session?.user.email}</span></div>
        <div className="flex justify-between"><span className="text-muted">{t('admin.profile.role')}</span><span className="badge bg-primary/10 text-primary">{t('admin.profile.admin')}</span></div>
      </div>
      <form onSubmit={submit} className="card space-y-4 p-5" noValidate>
        <h2 className="text-base font-extrabold">{t('admin.profile.changePassword')}</h2>
        <div><label className="label" htmlFor="np">{t('admin.reset.newPassword')}</label><input id="np" type="password" autoComplete="new-password" className="input" {...register('password')} />{errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}</div>
        <div><label className="label" htmlFor="cp">{t('admin.reset.confirm')}</label><input id="cp" type="password" autoComplete="new-password" className="input" {...register('confirm')} />{errors.confirm && <p className="mt-1 text-xs text-red-500">{errors.confirm.message}</p>}</div>
        <button className="btn btn-primary btn-sm" disabled={isSubmitting}>{t('admin.reset.save')}</button>
      </form>
      <button className="btn" onClick={signOut}><LogOut size={16} />{t('admin.logout')}</button>
    </div>
  );
}
