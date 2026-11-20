import { useState } from 'react';
import { ChevronLeft, ChevronRight, ListChecks, RotateCcw, Layers } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ToolShell } from '../../components/ToolShell';
import { ParticipantsPanel } from '../../components/ParticipantsPanel';
import { GroupSettings, type GroupCfg } from '../../components/GroupSettings';
import { GroupCards } from '../../components/ResultView';
import { ResultActions } from '../../components/ResultActions';
import { useParticipants } from '../../hooks/useParticipants';
import { useSettings } from '../../hooks/useSettings';
import { useToast } from '../../hooks/useToast';
import { completeSpin, runSpin } from '../../lib/spinService';
import { errorText, motionOk, ticker } from '../../lib/anim';
import { sound } from '../../lib/sound';
import type { HistoryRecord } from '../../types';

export default function GroupSpin() {
  const { t } = useTranslation();
  const toast = useToast();
  const { settings } = useSettings();
  const p = useParticipants(false);
  const [cfg, setCfg] = useState<GroupCfg>({ mode: 'size', value: 4 });
  const [rec, setRec] = useState<HistoryRecord | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [focus, setFocus] = useState(0);
  const [drawing, setDrawing] = useState(false);
  const [tick, setTick] = useState('');
  const [final, setFinal] = useState(false);
  const total = rec?.output.groups?.length ?? 0;
  const animate = motionOk(settings.features.animations);

  const start = async () => {
    if (p.names.length < 1) { toast('error', t('groups.needOne')); return; }
    try { const r = await runSpin('groupspin', p.names, cfg, settings.system); setRec(r); setRevealed(0); setFocus(0); setFinal(false); }
    catch (e) { toast('error', errorText(e, t)); }
  };
  const revealNext = async () => {
    if (!rec || drawing || revealed >= total) return;
    setDrawing(true);
    await ticker(rec.participants, animate ? 1400 : 0, setTick);
    const n = revealed + 1; setRevealed(n); setFocus(n - 1); setDrawing(false); setTick('');
    if (settings.features.sound) sound.pop();
    if (n === total) completeSpin(rec);
  };
  const restart = () => { setRec(null); setRevealed(0); setFinal(false); };

  return (
    <ToolShell tool="groupspin">
      {!rec ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <ParticipantsPanel p={p} />
          <div className="space-y-4">
            <GroupSettings cfg={cfg} onChange={setCfg} total={p.names.length} />
            <button className="btn btn-primary w-full" disabled={p.names.length < 1} onClick={start}><Layers size={16} />{t('groupspin.start')}</button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {!final && (
            <div className="card relative overflow-hidden p-6 text-center sm:p-10">
              <div className="absolute inset-x-0 top-0 h-1 bg-line"><div className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500" style={{ width: `${(revealed / total) * 100}%` }} /></div>
              <p className="text-sm font-semibold text-muted">{t('groupspin.step', { n: Math.min(revealed + (drawing ? 1 : 0), total) || 1, total })}</p>
              <div className="mx-auto mt-5 grid min-h-[120px] max-w-md place-items-center">
                {drawing ? <div className="text-3xl font-extrabold text-primary" aria-live="off">{tick || t('groupspin.drawing')}</div>
                  : revealed > 0 ? <div className="w-full text-start"><GroupCards groups={[rec.output.groups![focus]]} highlight={0} /></div>
                  : <div className="text-lg text-muted">{t('groupspin.reveal')}</div>}
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <button className="btn" disabled={focus <= 0 || drawing} onClick={() => setFocus(focus - 1)}><ChevronLeft size={16} className="rtl:rotate-180" />{t('groupspin.previous')}</button>
                {focus < revealed - 1 && <button className="btn" onClick={() => setFocus(focus + 1)}>{t('common.next')}<ChevronRight size={16} /></button>}
                {revealed < total && <button className="btn btn-primary" disabled={drawing} onClick={revealNext}>{drawing ? t('groupspin.drawing') : t('groupspin.next')}<ChevronRight size={16} /></button>}
                {revealed === total && <button className="btn btn-primary" onClick={() => setFinal(true)}><ListChecks size={16} />{t('groupspin.finish')}</button>}
              </div>
              {revealed > 1 && <div className="mt-4 flex flex-wrap justify-center gap-1.5" aria-label={t('groupspin.goTo')}>{Array.from({ length: revealed }, (_, i) => <button key={i} onClick={() => setFocus(i)} aria-label={`${t('groupspin.goTo')} ${i + 1}`} className={`h-8 w-8 rounded-lg text-xs font-bold transition ${focus === i ? 'bg-primary text-white' : 'bg-surface2 text-muted hover:text-ink'}`}>{i + 1}</button>)}</div>}
            </div>)}
          {final && (<>
            <h2 className="text-xl font-extrabold">{t('groupspin.finalTitle')}</h2>
            <ResultActions rec={rec} onRegenerate={async () => { await start(); }} onReset={restart} />
            <GroupCards groups={rec.output.groups!} />
            <button className="btn btn-ghost btn-sm" onClick={() => { setFinal(false); setFocus(total - 1); }}><ChevronLeft size={15} />{t('groupspin.previous')}</button>
          </>)}
          {!final && <button className="btn btn-ghost btn-sm" onClick={restart}><RotateCcw size={15} />{t('groupspin.restart')}</button>}
        </div>)}
    </ToolShell>
  );
}
