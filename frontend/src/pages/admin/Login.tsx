import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Logo } from '../../components/Logo';
import { LanguageSwitch } from '../../components/LanguageSwitch';
import { ThemeToggle } from '../../components/ThemeToggle';
import { NotConfigured } from '../../components/admin/ui';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

export default function Login() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { signIn, session, isAdmin } = useAuth();
  const [msg, setMsg] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);
  const schema = z.object({ email: z.string().email(t('validation.email')), password: z.string().min(1, t('validation.required')) });
  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  if (session && isAdmin) return <Navigate to="/admin" replace />;
  const submit = handleSubmit(async ({ email, password }) => {
    setMsg(null);
    const r = await signIn(email, password);
    if (r === 'ok') nav('/admin'); else setMsg({ kind: 'error', text: t(r === 'not_admin' ? 'admin.login.notAdmin' : 'admin.login.error') });
  });
  const forgot = async () => {
    const email = getValues('email');
    if (!z.string().email().safeParse(email).success) { setMsg({ kind: 'error', text: t('validation.email') }); return; }
    await supabase?.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/admin/reset` });
    setMsg({ kind: 'info', text: t('admin.login.sent') }); // same message whether or not the email exists
  };
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="absolute end-4 top-4 flex gap-1.5"><LanguageSwitch /><ThemeToggle /></div>
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center"><Logo size={36} /></div>
        <NotConfigured />
        <form onSubmit={submit} className="card space-y-4 p-6" noValidate>
          <h1 className="text-lg font-extrabold">{t('admin.login.title')}</h1>
          <div><label className="label" htmlFor="em">{t('admin.login.email')}</label><input id="em" type="email" autoComplete="username" className="input" {...register('email')} />{errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}</div>
          <div><label className="label" htmlFor="pw">{t('admin.login.password')}</label><input id="pw" type="password" autoComplete="current-password" className="input" {...register('password')} />{errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}</div>
          {msg && <p className={`text-sm ${msg.kind === 'error' ? 'text-red-500' : 'text-muted'}`} role="alert">{msg.text}</p>}
          <button className="btn btn-primary w-full" disabled={isSubmitting}>{t('admin.login.submit')}</button>
          <button type="button" className="w-full text-center text-sm font-semibold text-primary" onClick={forgot}>{t('admin.login.forgot')}</button>
        </form>
        <Link to="/" className="mt-5 block text-center text-sm text-muted hover:text-ink">{t('admin.login.backToSite')}</Link>
      </div>
    </div>
  );
}
