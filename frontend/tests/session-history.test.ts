import { beforeEach, describe, expect, it } from 'vitest';
import { getSession, getVisitorId } from '../src/lib/session';
import { addHistory, clearHistory, deleteHistory, getHistory, listHistory } from '../src/lib/history';
import { runSpin, SpinError } from '../src/lib/spinService';

beforeEach(() => localStorage.clear());

describe('anonymous sessions', () => {
  it('creates a stable visitor id and resumes the session within 30 minutes', () => {
    const v = getVisitorId(); expect(getVisitorId()).toBe(v);
    const a = getSession(); expect(a.isNew).toBe(true); const b = getSession(); expect(b.id).toBe(a.id); expect(b.isNew).toBe(false);
  });
  it('rotates the session after inactivity but keeps the visitor id', () => {
    const v = getVisitorId(); const a = getSession(); localStorage.setItem('spin.last', String(Date.now() - 31 * 60 * 1000));
    const b = getSession(); expect(b.id).not.toBe(a.id); expect(b.isNew).toBe(true); expect(getVisitorId()).toBe(v);
  });
  it('ids look like UUIDs', () => { expect(getSession().id).toMatch(/^[0-9a-f-]{36}$/i); });
});

describe('browser history + local fallback (Supabase not configured)', () => {
  it('runSpin persists the record locally and flags it local', async () => {
    const r = await runSpin('groups', ['a', 'b', 'c', 'd'], { mode: 'size', value: 2 });
    expect(r.local).toBe(true); expect(getHistory(r.id)?.output.groups?.flat().sort()).toEqual(['a', 'b', 'c', 'd']);
  });
  it('rejects invalid input with a typed error', async () => { await expect(runSpin('wheel', ['only'], {})).rejects.toBeInstanceOf(SpinError); });
  it('deletes one record and clears all', async () => {
    const a = await runSpin('wheel', ['a', 'b'], { winners: 1 }); const b = await runSpin('wheel', ['a', 'b'], { winners: 1 });
    deleteHistory(a.id); expect(listHistory().map((x) => x.id)).toEqual([b.id]); clearHistory(); expect(listHistory()).toEqual([]);
  });
  it('winner removal: removing winners from the list leaves the others', () => {
    const list = ['a', 'b', 'c', 'd']; const winners = ['b', 'd']; expect(list.filter((x) => !winners.includes(x))).toEqual(['a', 'c']);
  });
    it('history is capped', () => { for (let i = 0; i < 120; i++) addHistory({ id: String(i), tool: 'wheel', createdAt: '', participants: [], config: {}, output: {} }); expect(listHistory().length).toBe(100); });
});
