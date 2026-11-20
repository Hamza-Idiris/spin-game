// Public endpoint: records anonymous activity events (idempotent via eventId).
import { json, preflight } from '../_shared/cors.ts';
import { serviceClient, logSystemError } from '../_shared/clients.ts';
import { clientIp, isUuid, rateLimited } from '../_shared/ratelimit.ts';

const ALLOWED = new Set(['page_visit', 'session_start', 'session_end', 'spin_started', 'spin_completed', 'export_pdf', 'export_excel', 'system_error']);

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  if (req.method !== 'POST') return json(req, { error: 'method_not_allowed' }, 405);
  const db = serviceClient();
  try {
    const b = await req.json().catch(() => null);
    if (!b || !isUuid(b.eventId) || !isUuid(b.sessionId) || !ALLOWED.has(b.type)) return json(req, { error: 'bad_request' }, 400);
    if (rateLimited(`track:${clientIp(req)}`, 120) || rateLimited(`track:${b.sessionId}`, 90)) return json(req, { error: 'rate_limited' }, 429);
    const details = typeof b.details === 'object' && b.details && JSON.stringify(b.details).length < 1000 ? b.details : {};
    const { data, error } = await db.rpc('record_event', {
      p_event: b.eventId,
      p_session: b.sessionId,
      p_visitor: isUuid(b.visitorId) ? b.visitorId : null,
      p_type: b.type,
      p_path: typeof b.path === 'string' ? b.path.slice(0, 200) : null,
      p_entity: isUuid(b.entityId) ? b.entityId : null,
      p_details: details,
      p_status: b.status === 'failed' ? 'failed' : 'success',
      p_ua: req.headers.get('user-agent') ?? '',
    });
    if (error) throw error;
    return json(req, { recorded: data === true });
  } catch (e) {
    await logSystemError(db, 'track', e);
    return json(req, { error: 'server_error' }, 500);
  }
});
