import { useCallback, useState } from 'react';
import { dedupe, parseNames } from '../lib/engine';
import { useSettings } from './useSettings';

export interface AddReport { added: number; duplicates: number; truncated: boolean; overLimit: boolean }

/** Participant list state shared by all tools. `allowDuplicates` is true for the wheel (options may repeat). */
export function useParticipants(allowDuplicates = false) {
  const { settings } = useSettings();
  const { maxParticipants, maxNameLength } = settings.system;
  const [names, setNames] = useState<string[]>([]);

  const addText = useCallback((text: string): AddReport => {
    const raw = text.split(/[\n\r,;\t]+/).map((s) => s.trim()).filter(Boolean);
    const truncated = raw.some((s) => s.length > maxNameLength);
    let incoming = parseNames(text, maxNameLength);
    let duplicates = 0;
    if (!allowDuplicates) {
      const have = new Set(names.map((n) => n.toLocaleLowerCase()));
      const d = dedupe(incoming); duplicates = d.removed.length;
      incoming = d.unique.filter((n) => { if (have.has(n.toLocaleLowerCase())) { duplicates++; return false; } return true; });
    }
    const take = incoming.slice(0, Math.max(0, maxParticipants - names.length));
    if (take.length) setNames([...names, ...take]);
    return { added: take.length, duplicates, truncated, overLimit: take.length < incoming.length };
  }, [names, allowDuplicates, maxParticipants, maxNameLength]);

  const remove = useCallback((i: number) => setNames((c) => c.filter((_, j) => j !== i)), []);
  const edit = useCallback((i: number, v: string) => {
    const clean = parseNames(v, maxNameLength)[0]; if (!clean) return;
    setNames((c) => c.map((n, j) => (j === i ? clean : n)));
  }, [maxNameLength]);
  const removeMany = useCallback((list: string[]) => setNames((c) => { const rm = [...list]; return c.filter((n) => { const k = rm.indexOf(n); if (k >= 0) { rm.splice(k, 1); return false; } return true; }); }), []);
  const clear = useCallback(() => setNames([]), []);
  return { names, setNames, addText, remove, edit, removeMany, clear, max: maxParticipants };
}
