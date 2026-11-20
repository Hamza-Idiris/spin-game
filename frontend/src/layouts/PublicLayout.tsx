import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from '../components/Header';
import { useSettings } from '../hooks/useSettings';
import { flushQueue, startSessionIfNeeded, track, trackSessionEnd } from '../lib/tracker';
import Maintenance from '../pages/public/Maintenance';

export default function PublicLayout() {
  const { settings } = useSettings();
  const loc = useLocation();

  useEffect(() => { startSessionIfNeeded(); flushQueue(); const h = () => trackSessionEnd(); window.addEventListener('pagehide', h); window.addEventListener('online', flushQueue); return () => { window.removeEventListener('pagehide', h); window.removeEventListener('online', flushQueue); }; }, []);
  useEffect(() => { track('page_visit', { path: loc.pathname }); window.scrollTo({ top: 0 }); }, [loc.pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{settings.system.maintenance ? <Maintenance /> : <Outlet />}</main>
    </div>
  );
}
