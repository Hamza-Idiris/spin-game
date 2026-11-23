import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, Minus, Plus, Volume2, VolumeX, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ToolShell } from '../../components/ToolShell';
import { ParticipantsPanel } from '../../components/ParticipantsPanel';
import { Wheel, type WheelHandle } from '../../components/Wheel';
import { WinnersView } from '../../components/ResultView';
import { ResultActions } from '../../components/ResultActions';
import { WinnerCelebration } from '../../components/WinnerCelebration';
import { useParticipants } from '../../hooks/useParticipants';
import { useSettings } from '../../hooks/useSettings';
import { useToast } from '../../hooks/useToast';
import { completeSpin, runSpin } from '../../lib/spinService';
import { errorText, motionOk, sleep } from '../../lib/anim';
import { sound } from '../../lib/sound';
import type { HistoryRecord } from '../../types';

export default function RandomWheel() {
  const { t } = useTranslation();
  const toast = useToast();
  const { settings } = useSettings();
  const p = useParticipants(true);
  const [k, setK] = useState(1);
  const [remove, setRemove] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [vol, setVol] = useState(sound.getLevel());
  const [spinning, setSpinning] = useState(false);
  const [wheelNames, setWheelNames] = useState<string[]>([]);
  const [shown, setShown] = useState<string[]>([]);
  const [rec, setRec] = useState<HistoryRecord | null>(null);
  const [hl, setHl] = useState<number | null>(null);
  const [full, setFull] = useState(false);
  const [celebrate, setCelebrate] = useState<string | null>(null);
  const wheel = useRef<WheelHandle>(null);
  const box = useRef<HTMLDivElement>(null);
  const names = spinning || rec ? wheelNames : p.names;
  const sfx = soundOn && settings.features.sound && vol > 0;
  const animate = motionOk(settings.features.animations);

  useEffect(() => { const h = () => setFull(Boolean(document.fullscreenElement)); document.addEventListener('fullscreenchange', h); return () => document.removeEventListener('fullscreenchange', h); }, []);
  useEffect(() => { if (!spinning && !rec) setWheelNames(p.names); }, [p.names, spinning, rec]);

  const bumpVol = (dir: -1 | 1) => {
    const next = dir < 0 ? sound.quieter() : sound.louder();
    setVol(next);
    if (next > 0) setSoundOn(true);
    if (settings.features.sound && next > 0) sound.pop();
  };

  const spin = async () => {
    if (spinning) return;
    if (p.names.length < 2) { toast('error', t('wheel.needTwo')); return; }
    setSpinning(true); setRec(null); setShown([]); setHl(null); setCelebrate(null);
    try {
      const r = await runSpin('wheel', p.names, { winners: Math.min(k, p.names.length) }, settings.system);
      setWheelNames(r.participants);
      await sleep(30);
      const indexes = r.output.winnerIndexes ?? [];
      for (let n = 0; n < indexes.length; n++) {
        const idx = indexes[n];
        const dur = animate ? 5200 : 0;
        let alive = true;
        if (sfx && animate) (async () => { let gap = 60; while (alive && gap < 520) { sound.tick(); await sleep(gap); gap *= 1.07; } })();
        await wheel.current?.spinTo(idx, dur);
        alive = false;
        setHl(idx); if (sfx) sound.win();
        const winner = r.participants[idx];
        setShown((s) => [...s, winner]);
        setCelebrate(winner);
        await sleep(animate ? 3200 : 0);
        if (n < indexes.length - 1) setCelebrate(null);
      }
      setRec(r); completeSpin(r);
      if (remove) { p.removeMany(r.output.winners ?? []); }
    } catch (e) { toast('error', errorText(e, t)); }
    finally { setSpinning(false); }
  };

  const reset = () => { p.clear(); setRec(null); setShown([]); setHl(null); setWheelNames([]); setCelebrate(null); };
  const toggleFull = () => { if (document.fullscreenElement) document.exitFullscreen(); else box.current?.requestFullscreen?.(); };

  return (
    <ToolShell tool="wheel">
      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="space-y-5">
          <div ref={box} className="fullscreen-wheel card relative overflow-hidden p-4 sm:p-8">
            <Wheel ref={wheel} names={names} highlight={hl} />
            <WinnerCelebration name={celebrate ?? ''} open={Boolean(celebrate)} onClose={() => setCelebrate(null)} animate={animate} />
            <div className="no-print absolute end-3 top-3 z-10 flex items-center gap-1">
              <button className="btn btn-ghost !p-2" onClick={() => bumpVol(-1)} aria-label={t('wheel.volumeDown')} disabled={!settings.features.sound || vol <= sound.min}><Minus size={16} /></button>
              <button className="btn btn-ghost !p-2" onClick={() => setSoundOn(!soundOn)} aria-pressed={sfx} aria-label={t('wheel.sound')} disabled={!settings.features.sound}>{sfx ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
              <span className="min-w-[1.5rem] text-center text-xs font-bold tabular-nums text-muted" aria-live="polite">{vol}</span>
              <button className="btn btn-ghost !p-2" onClick={() => bumpVol(1)} aria-label={t('wheel.volumeUp')} disabled={!settings.features.sound || vol >= sound.max}><Plus size={16} /></button>
              <button className="btn btn-ghost !p-2" onClick={toggleFull} aria-label={full ? t('wheel.exitFullscreen') : t('wheel.fullscreen')}>{full ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button>
            </div>
            <div className="mt-6 flex flex-col items-center gap-4">
              <button className="btn btn-primary !px-10 !py-3.5 !text-base" onClick={spin} disabled={spinning || p.names.length < 2}><Play size={18} />{spinning ? t('wheel.spinning') : rec ? t('wheel.spinAgain') : t('wheel.spin')}</button>
              {p.names.length < 2 && !spinning && <p className="text-sm text-muted">{t('wheel.needTwo')}</p>}
              {shown.length > 0 && !celebrate && <WinnersView winners={shown} />}
            </div>
          </div>
          {rec && <ResultActions rec={rec} onReset={reset} />}
        </div>
        <div className="space-y-4">
          <ParticipantsPanel p={p} disabled={spinning} />
          <div className="card space-y-4 p-4 sm:p-5">
            <div>
              <label className="label" htmlFor="wk">{t('wheel.winners')}</label>
              <input id="wk" type="number" min={1} max={Math.max(1, Math.min(10, p.names.length))} className="input !w-24" value={k} disabled={spinning}
                onChange={(e) => setK(Math.max(1, Math.min(10, Math.floor(Number(e.target.value) || 1))))} />
            </div>
            <div className="inline-flex rounded-xl border border-line p-0.5 text-sm font-semibold" role="group">
              <button className={`rounded-[10px] px-3 py-1.5 transition ${!remove ? 'bg-primary text-white' : 'text-muted'}`} onClick={() => setRemove(false)} aria-pressed={!remove}>{t('wheel.keepWinners')}</button>
              <button className={`rounded-[10px] px-3 py-1.5 transition ${remove ? 'bg-primary text-white' : 'text-muted'}`} onClick={() => setRemove(true)} aria-pressed={remove}>{t('wheel.removeWinners')}</button>
            </div>
          </div>
        </div>
      </div>
    </ToolShell>
  );
}
