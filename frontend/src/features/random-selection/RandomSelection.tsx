import { useState } from 'react';
import { UserCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ToolShell } from '../../components/ToolShell';
import { ParticipantsPanel } from '../../components/ParticipantsPanel';
import { WinnersView } from '../../components/ResultView';
import { ResultActions } from '../../components/ResultActions';
import { useParticipants } from '../../hooks/useParticipants';
import { useSettings } from '../../hooks/useSettings';
import { useToast } from '../../hooks/useToast';
import { completeSpin, runSpin } from '../../lib/spinService';
import { errorText, motionOk, ticker } from '../../lib/anim';
import { sound } from '../../lib/sound';
import type { HistoryRecord } from '../../types';

export default function RandomSelection() {
  const { t } = useTranslation();
  const toast = useToast();
  const { settings } = useSettings();
  const p = useParticipants(false);
  const [count, setCount] = useState(1);
  const [retain, setRetain] = useState(true);
  const [rec, setRec] = useState<HistoryRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState('');

  const pick = async () => {
    if (p.names.length < 1) { toast('error', t('groups.needOne')); return; }
    setBusy(true); setRec(null);
    try {
      const r = await runSpin('select', p.names, { winners: Math.min(count, p.names.length) }, settings.system);
      await ticker(r.participants, motionOk(settings.features.animations) ? 1600 : 0, setTick);
      setTick(''); setRec(r); completeSpin(r);
      if (settings.features.sound) sound.win();
      if (!retain) p.removeMany(r.output.winners ?? []);
    } catch (e) { toast('error', errorText(e, t)); } finally { setBusy(false); setTick(''); }
  };
  return (
    <ToolShell tool="select">
      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          <div className="card grid min-h-[260px] place-items-center p-6 sm:p-10" aria-live="polite">
            {busy ? <div className="text-4xl font-extrabold text-primary sm:text-5xl">{tick}</div>
              : rec ? <div className="w-full space-y-1.5"><p className="text-center text-sm font-semibold text-muted">{t('select.selected')}</p><div className="flex justify-center"><WinnersView winners={rec.output.winners!} /></div></div>
              : <p className="text-muted">{t('input.empty')}</p>}
          </div>
          {rec && !busy && <ResultActions rec={rec} onRegenerate={pick} regenerateLabel={t('select.selectAgain')} onReset={() => setRec(null)} />}
        </div>
        <div className="space-y-4">
          <ParticipantsPanel p={p} disabled={busy} />
          <div className="card space-y-4 p-4 sm:p-5">
            <div><label className="label" htmlFor="sc">{t('select.count')}</label>
              <input id="sc" type="number" min={1} max={Math.max(1, p.names.length)} className="input !w-24" value={count} onChange={(e) => setCount(Math.max(1, Math.floor(Number(e.target.value) || 1)))} /></div>
            <div className="inline-flex rounded-xl border border-line p-0.5 text-sm font-semibold" role="group">
              <button className={`rounded-[10px] px-3 py-1.5 ${retain ? 'bg-primary text-white' : 'text-muted'}`} onClick={() => setRetain(true)} aria-pressed={retain}>{t('select.retain')}</button>
              <button className={`rounded-[10px] px-3 py-1.5 ${!retain ? 'bg-primary text-white' : 'text-muted'}`} onClick={() => setRetain(false)} aria-pressed={!retain}>{t('select.removeSelected')}</button>
            </div>
            <button className="btn btn-primary w-full" disabled={busy || p.names.length < 1} onClick={pick}><UserCheck size={16} />{t('select.pick')}</button>
          </div>
        </div>
      </div>
    </ToolShell>
  );
}
