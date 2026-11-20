import { useTranslation } from 'react-i18next';
import { groupSizes } from '../lib/engine';

export interface GroupCfg { mode: 'size' | 'count'; value: number }
export function GroupSettings({ cfg, onChange, total }: { cfg: GroupCfg; onChange: (c: GroupCfg) => void; total: number }) {
  const { t } = useTranslation();
  const sizes = total > 0 ? groupSizes(total, cfg.mode, Math.max(1, cfg.value)) : [];
  return (
    <div className="card space-y-4 p-4 sm:p-5">
      <div>
        <span className="label">{t('groups.by')}</span>
        <div className="inline-flex rounded-xl border border-line p-0.5 text-sm font-semibold" role="group">
          {(['size', 'count'] as const).map((m) => (
            <button key={m} onClick={() => onChange({ ...cfg, mode: m })} aria-pressed={cfg.mode === m} className={`rounded-[10px] px-3 py-1.5 transition ${cfg.mode === m ? 'bg-primary text-white' : 'text-muted'}`}>{t(`groups.${m}`)}</button>))}
        </div>
      </div>
      <div>
        <label className="label" htmlFor="gv">{t(`groups.${cfg.mode}`)}</label>
        <input id="gv" type="number" min={1} className="input !w-28" value={cfg.value} onChange={(e) => onChange({ ...cfg, value: Math.max(1, Math.floor(Number(e.target.value) || 1)) })} />
        <div className="mt-3 flex flex-wrap gap-2">{[2, 3, 4, 5, 6, 8].map((n) => <button key={n} className="btn btn-sm" onClick={() => onChange({ ...cfg, value: n })}>{n}</button>)}</div>
      </div>
      {sizes.length > 0 && <p className="text-sm text-muted">{t('groups.summary', { groups: sizes.length, people: total })} ({[...new Set(sizes)].join(' / ')})</p>}
    </div>
  );
}
