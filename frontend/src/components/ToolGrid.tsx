import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TOOLS, type Tool } from '../lib/engine';
import { TOOL_ICON, TOOL_PATH } from './ToolIcon';
import { useSettings } from '../hooks/useSettings';

export function ToolGrid() {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const on = TOOLS.filter((x) => settings.tools[x] !== false);
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {on.map((id: Tool, i) => { const Icon = TOOL_ICON[id]; return (
        <Link key={id} to={TOOL_PATH[id]} className="card group p-5 hover:-translate-y-0.5 hover:border-primary/40" style={{ animationDelay: `${i * 60}ms` }}>
          <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-white"><Icon size={22} /></span>
          <h3 className="text-base font-extrabold">{t(`tools.${id}.name`)}</h3>
          <p className="mt-1 text-sm text-muted">{t(`tools.${id}.desc`)}</p>
        </Link>); })}
    </div>
  );
}
