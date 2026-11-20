import type { HistoryRecord } from '../types';
const KEY = 'spin.history';
const MAX = 100;

export function listHistory(): HistoryRecord[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; }
}
function save(items: HistoryRecord[]) { try { localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX))); } catch { /* quota */ } }
export function addHistory(r: HistoryRecord) { save([r, ...listHistory().filter((x) => x.id !== r.id)]); }
export function getHistory(id: string) { return listHistory().find((r) => r.id === id) ?? null; }
export function deleteHistory(id: string) { save(listHistory().filter((r) => r.id !== id)); }
export function clearHistory() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } }
