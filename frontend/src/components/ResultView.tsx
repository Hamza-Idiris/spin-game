import { Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { HistoryRecord, Match } from '../types';

export function WinnersView({ winners }: { winners: string[] }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-3" aria-live="polite">
      {winners.map((w, i) => (
        <div key={`${w}-${i}`} className="reveal card flex items-center gap-3 px-4 py-3" style={{ animationDelay: `${i * 120}ms` }}>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-white"><Trophy size={18} /></span>
          <div><div className="text-xs text-muted">{t('wheel.winner')} {winners.length > 1 ? i + 1 : ''}</div><div className="text-lg font-extrabold">{w}</div></div>
        </div>))}
    </div>
  );
}

export function GroupCards({ groups, upTo = Infinity, highlight }: { groups: string[][]; upTo?: number; highlight?: number }) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {groups.slice(0, upTo).map((g, i) => (
        <div key={i} className={`reveal card p-4 ${highlight === i ? 'ring-2 ring-primary' : ''}`} style={{ animationDelay: `${Math.min(i, 12) * 70}ms` }}>
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="font-extrabold">{t('groups.group')} {i + 1}</h3>
            <span className="badge bg-primary/10 text-primary">{g.length}</span>
          </div>
          <ul className="space-y-1.5">{g.map((n, j) => <li key={j} className="rounded-lg bg-surface2 px-3 py-1.5 text-sm">{n}</li>)}</ul>
        </div>))}
    </div>
  );
}

export function MatchCards({ matches, upTo = Infinity }: { matches: Match[]; upTo?: number }) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {matches.slice(0, upTo).map((m, i) => (
        <div key={i} className="reveal card flex flex-wrap items-center justify-center gap-x-3 gap-y-1 p-4 text-center" style={{ animationDelay: `${Math.min(i, 12) * 70}ms` }}>
          {m.teams.map((tm, j) => (
            <span key={j} className="contents"><span className="rounded-lg bg-surface2 px-3 py-1.5 font-bold">{tm}</span>{j < m.teams.length - 1 && <span className="text-xs font-bold text-primary">{t('teams.vs')}</span>}</span>))}
          {m.bye && <span className="badge bg-accent/15 text-accent">{t('report.bye')}</span>}
        </div>))}
    </div>
  );
}

export function ResultView({ rec }: { rec: HistoryRecord }) {
  const o = rec.output;
  return <div className="space-y-4">{o.winners && <WinnersView winners={o.winners} />}{o.groups && <GroupCards groups={o.groups} />}{o.matches && <MatchCards matches={o.matches} />}</div>;
}
