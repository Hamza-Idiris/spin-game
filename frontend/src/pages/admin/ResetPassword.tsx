import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Logo } from '../../components/Logo';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';

export default function ResetPassword() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const toast = useToast();
  const [err, setErr] = useState('');
  const schema = z.object({ password: z.string().min(8, t('validation.passwordMin')), confirm: z.string() }).refine((v) => v.password === v.confirm, { path: ['confirm'], message: t('validation.match') });
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const submit = handleSubmit(async ({ password }) => {
    const { error } = await supabase!.auth.updateUser({ password });
    if (error) { setErr(error.message); return; }
    toast('success', t('admin.reset.done')); await supabase!.auth.signOut(); nav('/admin/login');
  });
  return (
    <div className="grid min-h-screen place-items-center px-4"><form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6" noValidate>
      <div className="flex justify-center"><Logo /></div><h1 className="text-lg font-extrabold">{t('admin.reset.title')}</h1>
      <div><label className="label" htmlFor="p1">{t('admin.reset.newPassword')}</label><input id="p1" type="password" autoComplete="new-password" className="input" {...register('password')} />{errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}</div>
      <div><label className="label" htmlFor="p2">{t('admin.reset.confirm')}</label><input id="p2" type="password" autoComplete="new-password" className="input" {...register('confirm')} />{errors.confirm && <p className="mt-1 text-xs text-red-500">{errors.confirm.message}</p>}</div>
      {err && <p className="text-sm text-red-500">{err}</p>}
      <button className="btn btn-primary w-full" disabled={isSubmitting}>{t('admin.reset.save')}</button>
    </form></div>
  );
}
