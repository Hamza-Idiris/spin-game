import { describe, expect, it } from 'vitest';
import { computeOutput, dedupe, groupSizes, makeMatches, parseNames, pickDistinctIndexes, secureInt, shuffle, splitIntoGroups, validateRequest } from '../src/lib/engine';

const names = (n: number) => Array.from({ length: n }, (_, i) => `P${i}`);

describe('secureInt / shuffle (distribution, not a fixed output)', () => {
  it('stays in range and is roughly uniform', () => {
    const N = 60000, K = 6; const c = new Array(K).fill(0);
    for (let i = 0; i < N; i++) c[secureInt(K)]++;
    const exp = N / K; const chi = c.reduce((s, x) => s + (x - exp) ** 2 / exp, 0);
    expect(Math.min(...c)).toBeGreaterThan(0);
    expect(chi).toBeLessThan(25); // df=5, p≈0.0001 critical ≈ 25.7 — a fair RNG virtually never exceeds this
  });
  it('rejects invalid max', () => { expect(() => secureInt(0)).toThrow(); expect(() => secureInt(1.5)).toThrow(); });
  it('shuffle returns a permutation and does not mutate input', () => {
    const src = names(50); const copy = [...src]; const out = shuffle(src);
    expect(src).toEqual(copy); expect([...out].sort()).toEqual([...src].sort());
  });
  it('shuffle is unbiased: every item lands in every position about equally often', () => {
    const items = ['a', 'b', 'c', 'd']; const pos: Record<string, number[]> = Object.fromEntries(items.map((i) => [i, [0, 0, 0, 0]]));
    const N = 24000; for (let i = 0; i < N; i++) shuffle(items).forEach((v, p) => pos[v][p]++);
    for (const it of items) for (const n of pos[it]) expect(Math.abs(n - N / 4)).toBeLessThan(N / 4 * 0.1);
  });
});

describe('winner selection', () => {
  it('picks distinct, in-range indexes', () => {
    for (let i = 0; i < 200; i++) { const idx = pickDistinctIndexes(10, 4); expect(new Set(idx).size).toBe(4); idx.forEach((x) => { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(10); }); }
  });
  it('wheel winner is uniform over participants', () => {
    const c = new Array(5).fill(0); const N = 20000; const p = names(5);
    for (let i = 0; i < N; i++) c[computeOutput('wheel', p, { winners: 1 }).winnerIndexes![0]]++;
    c.forEach((x) => expect(Math.abs(x - N / 5)).toBeLessThan(N / 5 * 0.1));
  });
  it('winners array matches winnerIndexes', () => {
    const p = names(8); const o = computeOutput('wheel', p, { winners: 3 });
    expect(o.winners).toEqual(o.winnerIndexes!.map((i) => p[i]));
  });
});

describe('groups', () => {
  it('divides 16 into 4 groups of 4', () => { expect(groupSizes(16, 'size', 4)).toEqual([4, 4, 4, 4]); });
  it('distributes remainders as evenly as possible (never differ by more than 1)', () => {
    for (let total = 1; total <= 60; total++) for (const size of [2, 3, 4, 5, 6, 8, 11]) {
      const s = groupSizes(total, 'size', size);
      expect(s.reduce((a, b) => a + b, 0)).toBe(total); expect(Math.max(...s) - Math.min(...s)).toBeLessThanOrEqual(1);
    }
  });
  it('supports number-of-groups mode and clamps to participants', () => {
    expect(groupSizes(10, 'count', 3)).toEqual([4, 3, 3]); expect(groupSizes(3, 'count', 9)).toEqual([1, 1, 1]);
  });
  it('never assigns a person twice or drops anyone', () => {
    for (let i = 0; i < 100; i++) { const p = names(23); const g = splitIntoGroups(p, 'size', 5).flat(); expect(g.length).toBe(23); expect(new Set(g).size).toBe(23); expect([...g].sort()).toEqual([...p].sort()); }
  });
});

describe('team matching', () => {
  it('each team appears exactly once per round', () => {
    for (let n = 2; n <= 21; n++) { const m = makeMatches(names(n)); const all = m.flatMap((x) => x.teams); expect(all.length).toBe(n); expect(new Set(all).size).toBe(n); }
  });
  it('odd team count yields exactly one BYE; even yields none', () => {
    expect(makeMatches(names(7)).filter((m) => m.bye).length).toBe(1);
    expect(makeMatches(names(8)).filter((m) => m.bye).length).toBe(0);
    expect(makeMatches(names(7)).find((m) => m.bye)!.teams.length).toBe(1);
  });
  it('supports multi-team matches', () => { const m = makeMatches(names(9), 3); expect(m.length).toBe(3); m.forEach((x) => expect(x.teams.length).toBe(3)); });
});

describe('input handling', () => {
  it('parses pasted lists and trims', () => { expect(parseNames(' Ann, Bob;\nCy\t Di  \n\n')).toEqual(['Ann', 'Bob', 'Cy', 'Di']); });
  it('strips markup characters and control chars', () => { expect(parseNames('<b>Ann</b>\u0000x')[0]).not.toMatch(/[<>\u0000]/); });
  it('dedupes case-insensitively and reports what was removed', () => {
    const r = dedupe(['Ann', 'ann', 'Bob', 'ANN']); expect(r.unique).toEqual(['Ann', 'Bob']); expect(r.removed).toEqual(['ann', 'ANN']);
  });
});

describe('server-side request validation', () => {
  it('rejects bad tools, too few and too many', () => {
    expect(validateRequest('nope', ['a', 'b'], {}).ok).toBe(false);
    expect(validateRequest('select', names(5), { winners: 1 })).toMatchObject({ ok: false, error: 'invalid_tool' });
    expect(validateRequest('groupspin', names(5), { mode: 'size', value: 2 })).toMatchObject({ ok: false, error: 'invalid_tool' });
    expect(validateRequest('wheel', ['a'], {})).toMatchObject({ ok: false, error: 'too_few' });
    expect(validateRequest('groups', names(600), { mode: 'size', value: 4 })).toMatchObject({ ok: false, error: 'too_many' });
  });
  it('rejects invalid config and accepts valid', () => {
    expect(validateRequest('wheel', names(5), { winners: 9 })).toMatchObject({ ok: false, error: 'invalid_config' });
    expect(validateRequest('groups', names(5), { mode: 'size', value: 0 })).toMatchObject({ ok: false, error: 'invalid_config' });
    expect(validateRequest('teams', names(4), { perMatch: 2 }).ok).toBe(true);
  });
  it('dedupes non-wheel tools but keeps wheel options as given', () => {
    const g = validateRequest('groups', ['a', 'A', 'b'], { mode: 'size', value: 2 }); expect(g.ok && g.participants).toEqual(['a', 'b']);
    const w = validateRequest('wheel', ['a', 'a', 'b'], {}); expect(w.ok && w.participants).toEqual(['a', 'a', 'b']);
  });
});
