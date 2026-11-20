import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';
import so from '../locales/so.json';

export const LANGS = ['en', 'so'] as const;
export type Lang = (typeof LANGS)[number];

function saved(): Lang {
  try { const l = localStorage.getItem('spin.lang'); if (l === 'en' || l === 'so') return l; } catch { /* ignore */ }
  return 'en';
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, so: { translation: so } },
  lng: saved(), fallbackLng: 'en', interpolation: { escapeValue: false },
});

export function setLanguage(l: Lang) {
  i18n.changeLanguage(l);
  try { localStorage.setItem('spin.lang', l); } catch { /* ignore */ }
  document.documentElement.lang = l;
}
export default i18n;
