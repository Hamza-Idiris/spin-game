import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { applyTheme, saveTheme } from '../lib/theme';
import { useSettings } from '../hooks/useSettings';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const read = () => (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  const [theme, setTheme] = useState<'light' | 'dark'>(read);
  useEffect(() => { const o = new MutationObserver(() => setTheme(read())); o.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] }); return () => o.disconnect(); }, []);
  const { allowLight, allowDark } = settings.appearance;
  if (!(allowLight && allowDark)) return null;
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button className="btn btn-ghost !p-2.5" aria-label={`${t('common.theme')}: ${t(`common.${next}`)}`} onClick={() => { applyTheme(next); saveTheme(next); }}>
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
