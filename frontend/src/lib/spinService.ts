import { callFunction, isConfigured } from './supabase';
import { computeOutput, validateRequest, DEFAULT_LIMITS, type Limits, type SpinConfig, type SpinOutput, type Tool } from './shared/engine';
import { getSession, getVisitorId, newId } from './session';
import { addHistory } from './history';
import { track } from './tracker';
import type { HistoryRecord } from '../types';

export class SpinError extends Error { constructor(public code: string) { super(code); } }

/**
 * Runs a spin. The result (winner / groups / matches) is chosen on the SERVER with a CSPRNG when Supabase is
 * configured and reachable; the UI animation only displays that result. If the server is unreachable the same
 * engine runs locally (crypto.getRandomValues) and the record is flagged `local`.
 */
export async function runSpin(tool: Tool, participants: string[], config: SpinConfig, limits: Limits = DEFAULT_LIMITS): Promise<HistoryRecord> {
  const v = validateRequest(tool, participants, config, limits);
  if (!v.ok) throw new SpinError(v.error);
  const s = getSession();
  track('spin_started', { details: { tool } });

  let rec: HistoryRecord | null = null;
  if (isConfigured) {
    try {
      const r = await callFunction<{ resultId: string; participants: string[]; config: SpinConfig; output: SpinOutput }>('spin-submit', {
        tool, participants: v.participants, config: v.config, sessionId: s.id, visitorId: getVisitorId(), eventId: newId(),
      });
      rec = { id: newId(), serverId: r.resultId, tool, createdAt: new Date().toISOString(), participants: r.participants, config: r.config, output: r.output };
    } catch (e) {
      const code = (e as Error).message;
      if (['too_few', 'too_many', 'invalid_config', 'tool_disabled', 'maintenance', 'rate_limited'].includes(code)) throw new SpinError(code);
      // network / server failure: fall through to the local engine so the user is never blocked
    }
  }
  if (!rec) {
    rec = { id: newId(), tool, createdAt: new Date().toISOString(), participants: v.participants, config: v.config, output: computeOutput(tool, v.participants, v.config), local: true };
  }
  addHistory(rec);
  return rec;
}

export function completeSpin(rec: HistoryRecord) {
  track('spin_completed', { entityId: rec.serverId, details: { tool: rec.tool } });
}
