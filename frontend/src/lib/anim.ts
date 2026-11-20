import type { TFunction } from 'i18next';
import { SpinError } from './spinService';
export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
export const motionOk = (animationsEnabled: boolean) => animationsEnabled && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
export const errorText = (e: unknown, t: TFunction) => t(`errors.${e instanceof SpinError ? e.code : 'generic'}`);
/** Cosmetic shuffle display; it never decides the outcome. */
export async function ticker(names: string[], ms: number, onTick: (s: string) => void, every = 70) {
  if (!names.length || ms <= 0) return;
  const end = Date.now() + ms;
  while (Date.now() < end) { onTick(names[Math.floor(Math.random() * names.length)]); await sleep(every); }
}
