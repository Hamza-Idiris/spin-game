import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import type { Tool } from '../types';
import { TOOL_ICON } from './ToolIcon';
import { useSettings } from '../hooks/useSettings';

export function ToolShell({ tool, children }: { tool: Tool; children: ReactNode }) {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const Icon = TOOL_ICON[tool];
  return (
    <div className="page-in mx-auto max-w-6xl px-4 py-8">
      <Link to="/tools" className="no-print mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-ink"><ArrowLeft size={16} className="rtl:rotate-180" />{t('common.back')}</Link>
      <div className="mb-6 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><Icon size={22} /></span>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t(`tools.${tool}.name`)}</h1>
      </div>
      {settings.tools[tool] === false ? <div className="card p-8 text-center text-muted">{t('tools.disabled')}</div> : children}
    </div>
  );
}
