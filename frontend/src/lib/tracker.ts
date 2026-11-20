import { callFunction, isConfigured } from './supabase';
import { getSession, getVisitorId, newId } from './session';

export type EventType = 'page_visit' | 'session_start' | 'session_end' | 'spin_started' | 'spin_completed' | 'export_pdf' | 'export_excel' | 'system_error';
interface QueuedEvent { eventId: string; sessionId: string; visitorId: string; type: EventType; path?: string; entityId?: string; status?: string; details?: Record<string, unknown>; tries: number }

const QKEY = 'spin.queue';
const loadQ = (): QueuedEvent[] => { try { return JSON.parse(localStorage.getItem(QKEY) ?? '[]'); } catch { return []; } };
const saveQ = (q: QueuedEvent[]) => { try { localStorage.setItem(QKEY, JSON.stringify(q.slice(-100))); } catch { /* ignore */ } };

async function send(ev: QueuedEvent, keepalive = false) {
  const { tries: _t, ...body } = ev;
  await callFunction('track', body, { keepalive });
}

/** Fire-and-forget with retry queue. The eventId makes retries idempotent on the server. */
export function track(type: EventType, extra: { path?: string; entityId?: string; status?: string; details?: Record<string, unknown> } = {}, keepalive = false) {
  if (!isConfigured) return;
  const s = getSession();
  const ev: QueuedEvent = { eventId: newId(), sessionId: s.id, visitorId: getVisitorId(), type, tries: 0, ...extra };
  send(ev, keepalive).catch(() => { saveQ([...loadQ(), ev]); });
}

export async function flushQueue() {
  if (!isConfigured) return;
  const q = loadQ(); if (!q.length) return;
  const rest: QueuedEvent[] = [];
  for (const ev of q) {
    try { await send(ev); } catch (e) { if (ev.tries < 5 && (e as Error).message !== 'bad_request') rest.push({ ...ev, tries: ev.tries + 1 }); }
  }
  saveQ(rest);
}

export function startSessionIfNeeded() {
  const s = getSession(false);
  if (s.isNew) { getSession(true); track('session_start'); }
  else getSession(true);
}

export function trackSessionEnd() { track('session_end', {}, true); }
