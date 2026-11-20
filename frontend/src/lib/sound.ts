let ctx: AudioContext | null = null;
function ac() { if (!ctx) { try { ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)(); } catch { return null; } } return ctx; }
function tone(freq: number, dur: number, when = 0, type: OscillatorType = 'sine', vol = 0.05) {
  const c = ac(); if (!c) return;
  const o = c.createOscillator(); const g = c.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, c.currentTime + when);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + when + dur);
  o.connect(g).connect(c.destination); o.start(c.currentTime + when); o.stop(c.currentTime + when + dur);
}
export const sound = {
  tick: () => tone(880, 0.05, 0, 'square', 0.02),
  win: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, i * 0.1, 'triangle', 0.06)); },
  pop: () => tone(660, 0.08, 0, 'sine', 0.05),
};
