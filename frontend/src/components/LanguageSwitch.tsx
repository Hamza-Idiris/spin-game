import { useTranslation } from 'react-i18next';
import { LANGS, setLanguage, type Lang } from '../lib/i18n';

export function LanguageSwitch() {
  const { i18n, t } = useTranslation();
  return (
    <div className="inline-flex rounded-xl border border-line bg-surface p-0.5" role="group" aria-label={t('common.language')}>
      {LANGS.map((l) => (
        <button key={l} onClick={() => setLanguage(l as Lang)} aria-pressed={i18n.language === l}
          className={`rounded-[10px] px-2.5 py-1.5 text-xs font-bold transition ${i18n.language === l ? 'bg-primary text-white' : 'text-muted hover:text-ink'}`}>
          {l === 'en' ? 'EN' : 'SO'}
        </button>))}
    </div>
  );
}
