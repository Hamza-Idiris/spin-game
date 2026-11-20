export type Theme = 'light' | 'dark';
export function systemTheme(): Theme { return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
export function savedTheme(): Theme | null { try { const t = localStorage.getItem('spin.theme'); return t === 'light' || t === 'dark' ? t : null; } catch { return null; } }
export function applyTheme(t: Theme, animate = true) {
  const root = document.documentElement;
  if (animate) { root.classList.add('theme-fade'); setTimeout(() => root.classList.remove('theme-fade'), 400); }
  root.classList.toggle('dark', t === 'dark');
}
export function saveTheme(t: Theme) { try { localStorage.setItem('spin.theme', t); } catch { /* ignore */ } }
export function hexToRgbTriplet(hex: string): string | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex); if (!m) return null;
  const n = parseInt(m[1], 16); return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}
