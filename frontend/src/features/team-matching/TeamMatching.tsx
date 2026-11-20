import { useState } from 'react';
import { Swords, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ToolShell } from '../../components/ToolShell';
import { ParticipantsPanel } from '../../components/ParticipantsPanel';
import { MatchCards } from '../../components/ResultView';
import { ResultActions } from '../../components/ResultActions';
import { useParticipants } from '../../hooks/useParticipants';
import { useSettings } from '../../hooks/useSettings';
import { useToast } from '../../hooks/useToast';
import { completeSpin, runSpin } from '../../lib/spinService';
import { errorText } from '../../lib/anim';
import type { HistoryRecord } from '../../types';

export default function TeamMatching() {
  const { t } = useTranslation();
  const toast = useToast();
  const { settings } = useSettings();
  const p = useParticipants(false);
  const [perMatch, setPerMatch] = useState(2);
  const [oneByOne, setOneByOne] = useState(false);
  const [rec, setRec] = useState<HistoryRecord | null>(null);
  const [shown, setShown] = useState(0);
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    if (p.names.length < 2) { toast('error', t('teams.needTwo')); return; }
    setBusy(true);
    try {
      const r = await runSpin('teams', p.names, { perMatch }, settings.system);
      setRec(r); setShown(oneByOne ? 0 : r.output.matches!.length);
      if (!oneByOne) completeSpin(r);
    } catch (e) { toast('error', errorText(e, t)); } finally { setBusy(false); }
  };
  const total = rec?.output.matches?.length ?? 0;
  const next = () => { if (!rec) return; const n = shown + 1; setShown(n); if (n === total) completeSpin(rec); };

  return (
    <ToolShell tool="teams">
      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <div className="space-y-4">
          <ParticipantsPanel p={p} placeholder={t('teams.placeholder')} label={t('report.participants')} />
          <div className="card space-y-4 p-4 sm:p-5">
            <div>
              <label className="label" htmlFor="pm">{t('teams.perMatch')}</label>
              <select id="pm" className="input" value={perMatch} onChange={(e) => setPerMatch(Number(e.target.value))}>
                <option value={2}>{t('teams.oneVsOne')}</option>
                {[3, 4, 5, 6].map((n) => <option key={n} value={n}>{t('teams.nWay', { n })}</option>)}
              </select>
            </div>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold"><input type="checkbox" className="h-4 w-4 accent-[rgb(var(--primary))]" checked={oneByOne} onChange={(e) => setOneByOne(e.target.checked)} />{t('teams.revealOne')}</label>
            <button className="btn btn-primary w-full" disabled={busy || p.names.length < 2} onClick={generate}><Swords size={16} />{t('teams.generate')}</button>
          </div>
        </div>
        <div className="space-y-4">
          {!rec && <div className="card grid min-h-[260px] place-items-center p-8 text-center text-muted">{t('input.empty')}</div>}
          {rec && (<>
            <MatchCards matches={rec.output.matches!} upTo={shown} />
            {shown < total && <button className="btn btn-primary" onClick={next}><Eye size={16} />{t('teams.next')} ({shown}/{total})</button>}
            {shown < total && shown > 0 && <button className="btn ms-2" onClick={() => { setShown(total); completeSpin(rec); }}>{t('teams.revealAll')}</button>}
            {shown === total && <ResultActions rec={rec} onRegenerate={generate} onReset={() => { setRec(null); setShown(0); }} />}
          </>)}
        </div>
      </div>
    </ToolShell>
  );
}
