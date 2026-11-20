import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../hooks/useSettings';
import { ToolGrid } from '../../components/ToolGrid';

export default function Home() {
  const { t, i18n } = useTranslation();
  const { settings } = useSettings();
  const g = settings.general;
  // Admin-edited headline applies to English; Somali always uses the translation so both languages stay correct.
  const headline = i18n.language === 'en' && g.headline ? g.headline : t('hero.title');
  const subtitle = i18n.language === 'en' && g.subtitle ? g.subtitle : t('hero.subtitle');
  return (
    <div className="page-in">
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-16 text-center sm:pt-24">
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl">{headline}</h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-muted sm:text-lg">{subtitle}</p>
        <Link to="/tools" className="btn btn-primary mt-8 !px-8 !py-3.5 !text-base">{t('hero.cta')}<ArrowRight size={18} className="rtl:rotate-180" /></Link>
      </section>
      <section className="mx-auto max-w-6xl px-4 pb-20"><ToolGrid /></section>
    </div>
  );
}
