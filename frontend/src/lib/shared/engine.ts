// SPIN randomization engine. Pure TypeScript, WebCrypto only.
// SINGLE SOURCE: supabase/functions/_shared/engine.ts  (copied to frontend/src/lib/shared by scripts/sync-shared.sh)
export type Tool = 'wheel' | 'teams' | 'groups' | 'groupspin' | 'select';
export const TOOLS: Tool[] = ['wheel', 'teams', 'groups', 'groupspin', 'select'];
export interface Match { teams: string[]; bye?: boolean }
export interface SpinOutput {
  winners?: string[];
  winnerIndexes?: number[];
  groups?: string[][];
  matches?: Match[];
}
export interface SpinConfig {
  winners?: number;
  perMatch?: number;
  mode?: 'size' | 'count';
  value?: number;
}
export interface Limits { maxParticipants: number; maxNameLength: number }
export const DEFAULT_LIMITS: Limits = { maxParticipants: 500, maxNameLength: 80 };

/** Uniform integer in [0, max) using rejection sampling over a CSPRNG (no modulo bias). */
export function secureInt(max: number): number {
  if (!Number.isInteger(max) || max <= 0) throw new Error('max must be a positive integer');
  if (max === 1) return 0;
  const range = 0x100000000;
  const limit = range - (range % max);
  const buf = new Uint32Array(1);
  do { globalThis.crypto.getRandomValues(buf); } while (buf[0] >= limit);
  return buf[0] % max;
}

/** Fisher-Yates shuffle with a CSPRNG. Returns a new array. */
export function shuffle<T>(input: readonly T[]): T[] {
  const a = [...input];
  for (let i = a.length - 1; i > 0; i--) {
    const j = secureInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sanitizeName(s: string, maxLen = DEFAULT_LIMITS.maxNameLength): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\u0000-\u001F\u007F<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLen);
}

export function parseNames(text: string, maxLen = DEFAULT_LIMITS.maxNameLength): string[] {
  return text.split(/[\n\r,;\t]+/).map((s) => sanitizeName(s, maxLen)).filter(Boolean);
}

export function dedupe(names: string[]): { unique: string[]; removed: string[] } {
  const seen = new Set<string>();
  const unique: string[] = [];
  const removed: string[] = [];
  for (const n of names) {
    const k = n.toLocaleLowerCase();
    if (seen.has(k)) removed.push(n); else { seen.add(k); unique.push(n); }
  }
  return { unique, removed };
}

/** Group sizes that are as even as possible (differ by at most 1). */
export function groupSizes(total: number, mode: 'size' | 'count', value: number): number[] {
  if (total < 1) return [];
  const n = mode === 'count' ? Math.min(Math.max(1, value), total) : Math.ceil(total / Math.max(1, value));
  const base = Math.floor(total / n);
  const rem = total % n;
  return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0));
}

export function splitIntoGroups(names: string[], mode: 'size' | 'count', value: number): string[][] {
  const sh = shuffle(names);
  const out: string[][] = [];
  let at = 0;
  for (const s of groupSizes(names.length, mode, value)) { out.push(sh.slice(at, at + s)); at += s; }
  return out;
}

/** Random matches; each team appears exactly once. A lone leftover team gets a BYE. */
export function makeMatches(teams: string[], perMatch = 2): Match[] {
  const sh = shuffle(teams);
  const out: Match[] = [];
  for (let i = 0; i < sh.length; i += perMatch) {
    const chunk = sh.slice(i, i + perMatch);
    out.push(chunk.length === 1 ? { teams: chunk, bye: true } : { teams: chunk });
  }
  return out;
}

export function pickDistinctIndexes(n: number, k: number): number[] {
  return shuffle(Array.from({ length: n }, (_, i) => i)).slice(0, k);
}

export type ValidationError = 'too_few' | 'too_many' | 'invalid_config' | 'invalid_tool';
export type Validated =
  | { ok: true; participants: string[]; config: SpinConfig }
  | { ok: false; error: ValidationError };

export function validateRequest(tool: string, raw: unknown, cfg: SpinConfig | undefined, limits: Limits = DEFAULT_LIMITS): Validated {
  if (!TOOLS.includes(tool as Tool)) return { ok: false, error: 'invalid_tool' };
  if (!Array.isArray(raw)) return { ok: false, error: 'too_few' };
  let list = raw.filter((x) => typeof x === 'string').map((x) => sanitizeName(x as string, limits.maxNameLength)).filter(Boolean);
  if (tool !== 'wheel') list = dedupe(list).unique;
  const min = tool === 'teams' || tool === 'wheel' ? 2 : 1;
  if (list.length < min) return { ok: false, error: 'too_few' };
  if (list.length > limits.maxParticipants) return { ok: false, error: 'too_many' };
  const c = cfg ?? {};
  const posInt = (v: unknown, lo: number, hi: number) => Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi;
  const config: SpinConfig = {};
  if (tool === 'wheel' || tool === 'select') {
    const w = c.winners ?? 1;
    if (!posInt(w, 1, Math.min(list.length, 100))) return { ok: false, error: 'invalid_config' };
    config.winners = w;
  } else if (tool === 'teams') {
    const p = c.perMatch ?? 2;
    if (!posInt(p, 2, 8)) return { ok: false, error: 'invalid_config' };
    config.perMatch = p;
  } else {
    const mode = c.mode ?? 'size';
    const v = c.value ?? 2;
    if ((mode !== 'size' && mode !== 'count') || !posInt(v, 1, limits.maxParticipants)) return { ok: false, error: 'invalid_config' };
    config.mode = mode; config.value = v;
  }
  return { ok: true, participants: list, config };
}

export function computeOutput(tool: Tool, participants: string[], config: SpinConfig): SpinOutput {
  switch (tool) {
    case 'wheel':
    case 'select': {
      const idx = pickDistinctIndexes(participants.length, config.winners ?? 1);
      return { winnerIndexes: idx, winners: idx.map((i) => participants[i]) };
    }
    case 'teams': return { matches: makeMatches(participants, config.perMatch ?? 2) };
    case 'groups':
    case 'groupspin': return { groups: splitIntoGroups(participants, config.mode ?? 'size', config.value ?? 2) };
  }
}
