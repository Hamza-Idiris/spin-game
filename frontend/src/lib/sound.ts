const VOL_KEY = 'spin.volume';
const MIN = 0;
const MAX = 10;
const DEFAULT = 7;

function clamp(n: number) { return Math.max(MIN, Math.min(MAX, Math.round(n))); }

function readLevel() {
  try {
    const n = Number(localStorage.getItem(VOL_KEY));
    if (Number.isFinite(n)) return clamp(n);
  } catch { /* ignore */ }
  return DEFAULT;
}

let level = readLevel();

let ctx: AudioContext | null = null;
function ac() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)(); }
    catch { return null; }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function master() { return level / MAX; }

function tone(freq: number, dur: number, when = 0, type: OscillatorType = 'sine', vol = 0.08) {
  const c = ac(); if (!c) return;
  const v = vol * master();
  if (v <= 0) return;
  const o = c.createOscillator(); const g = c.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(v, c.currentTime + when);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + when + dur);
  o.connect(g).connect(c.destination); o.start(c.currentTime + when); o.stop(c.currentTime + when + dur);
}

export const sound = {
  tick: () => tone(980, 0.07, 0, 'square', 0.12),
  win: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.28, i * 0.1, 'triangle', 0.14)); },
  pop: () => tone(660, 0.08, 0, 'sine', 0.1),
  getLevel: () => level,
  setLevel: (n: number) => {
    level = clamp(n);
    try { localStorage.setItem(VOL_KEY, String(level)); } catch { /* ignore */ }
    return level;
  },
  quieter: () => sound.setLevel(level - 1),
  louder: () => sound.setLevel(level + 1),
  min: MIN,
  max: MAX,
};
