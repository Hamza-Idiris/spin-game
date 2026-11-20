import { useState } from 'react';
import { NavLink, Navigate, Outlet } from 'react-router-dom';
import { Activity, BarChart3, DatabaseBackup, Download, LayoutDashboard, LogOut, Menu, Settings, Shuffle, User, Users, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { Logo } from '../components/Logo';
import { ThemeToggle } from '../components/ThemeToggle';
import { LanguageSwitch } from '../components/LanguageSwitch';
import { isConfigured } from '../lib/supabase';
import { NotConfigured } from '../components/admin/ui';

const NAV = [
  { to: '/admin', end: true, key: 'overview', icon: LayoutDashboard }, { to: '/admin/activities', key: 'activities', icon: Activity },
  { to: '/admin/results', key: 'results', icon: Shuffle }, { to: '/admin/sessions', key: 'sessions', icon: Users },
  { to: '/admin/exports', key: 'exports', icon: Download }, { to: '/admin/analytics', key: 'analytics', icon: BarChart3 },
  { to: '/admin/settings', key: 'settings', icon: Settings }, { to: '/admin/backup', key: 'backup', icon: DatabaseBackup },
  { to: '/admin/profile', key: 'profile', icon: User },
];

export default function AdminLayout() {
  const { t } = useTranslation();
  const { session, isAdmin, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  if (!isConfigured) return <div className="mx-auto max-w-xl p-6"><NotConfigured /></div>;
  if (loading) return <div className="grid min-h-screen place-items-center"><div className="skeleton h-10 w-40" /></div>;
  if (!session || !isAdmin) return <Navigate to="/admin/login" replace />;

  const nav = (
    <nav className="space-y-1 p-3">
      {NAV.map(({ to, end, key, icon: I }) => (
        <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
          className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-surface2 hover:text-ink'}`}>
          <I size={18} />{t(`admin.nav.${key}`)}
        </NavLink>))}
    </nav>
  );
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-e border-line bg-surface lg:flex">
        <div className="flex h-16 items-center px-5"><Logo size={28} /></div>
        <div className="flex-1 overflow-auto">{nav}</div>
        <div className="border-t border-line p-3"><button className="btn btn-ghost w-full justify-start" onClick={signOut}><LogOut size={18} />{t('admin.logout')}</button></div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-bg/80 px-4 backdrop-blur-xl">
          <button className="btn btn-ghost !p-2 lg:hidden" onClick={() => setOpen(true)} aria-label={t('admin.menu')}><Menu size={20} /></button>
          <div className="lg:hidden"><Logo size={26} /></div>
          <div className="ms-auto flex items-center gap-1.5"><LanguageSwitch /><ThemeToggle /></div>
        </header>
        <main className="page-in mx-auto max-w-7xl p-4 sm:p-6"><Outlet /></main>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="reveal absolute inset-y-0 start-0 flex w-72 flex-col bg-surface shadow-xl">
            <div className="flex h-16 items-center justify-between px-5"><Logo size={26} /><button className="btn btn-ghost !p-2" onClick={() => setOpen(false)} aria-label={t('common.close')}><X size={18} /></button></div>
            <div className="flex-1 overflow-auto">{nav}</div>
            <div className="border-t border-line p-3"><button className="btn btn-ghost w-full justify-start" onClick={signOut}><LogOut size={18} />{t('admin.logout')}</button></div>
          </div>
        </div>)}
    </div>
  );
}
