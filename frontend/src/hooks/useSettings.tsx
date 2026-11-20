import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { DEFAULT_SETTINGS } from '../lib/defaults';
import { applyTheme, hexToRgbTriplet, savedTheme, systemTheme } from '../lib/theme';
import type { SiteSettings } from '../types';

interface Ctx { settings: SiteSettings; loaded: boolean; reload: () => Promise<void> }
const SettingsCtx = createContext<Ctx>({ settings: DEFAULT_SETTINGS, loaded: false, reload: async () => {} });
export const useSettings = () => useContext(SettingsCtx);

function merge(remote: Partial<Record<keyof SiteSettings, unknown>>): SiteSettings {
  const out = { ...DEFAULT_SETTINGS } as Record<string, unknown>;
  for (const k of Object.keys(DEFAULT_SETTINGS) as (keyof SiteSettings)[]) {
    out[k] = { ...(DEFAULT_SETTINGS[k] as object), ...((remote[k] as object) ?? {}) };
  }
  return out as unknown as SiteSettings;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  const reload = async () => {
    if (supabase) {
      const { data } = await supabase.rpc('get_public_settings');
      if (data) setSettings(merge(data));
    }
    setLoaded(true);
  };
  useEffect(() => { reload(); }, []);

  // Apply appearance settings to the document
  useEffect(() => {
    const a = settings.appearance; const root = document.documentElement;
    const rgb = hexToRgbTriplet(a.primaryColor);
    if (rgb) root.style.setProperty('--primary', rgb); else root.style.removeProperty('--primary');
    root.classList.toggle('no-motion', !settings.features.animations);
    document.title = settings.general.name || 'SPIN';
    if (settings.general.faviconUrl) (document.getElementById('favicon') as HTMLLinkElement | null)?.setAttribute('href', settings.general.faviconUrl);
    // theme: saved choice > admin default > system; clamp to allowed themes
    let t = savedTheme() ?? (a.defaultTheme === 'system' ? systemTheme() : a.defaultTheme);
    if (t === 'dark' && !a.allowDark) t = 'light';
    if (t === 'light' && !a.allowLight) t = 'dark';
    applyTheme(t, false);
  }, [settings]);

  const value = useMemo(() => ({ settings, loaded, reload }), [settings, loaded]);
  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>;
}
