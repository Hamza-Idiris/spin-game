import { Link, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSwitch } from './LanguageSwitch';

export function Header() {
  const { t } = useTranslation();
  const link = ({ isActive }: { isActive: boolean }) => `rounded-lg px-3 py-2 text-sm font-semibold transition ${isActive ? 'text-primary' : 'text-muted hover:text-ink'}`;
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-2 sm:gap-6">
          <Link to="/" aria-label="Home"><Logo /></Link>
          <nav className="flex items-center">
            <NavLink to="/" end className={link}>{t('nav.home')}</NavLink>
            <NavLink to="/tools" className={link}>{t('nav.tools')}</NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-1.5"><LanguageSwitch /><ThemeToggle /></div>
      </div>
    </header>
  );
}
