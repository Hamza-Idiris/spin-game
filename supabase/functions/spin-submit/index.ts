// Public endpoint: validates input, chooses winners/groups/matches with a CSPRNG on the SERVER,
// stores the result and returns it. The browser animation only displays what is returned here.
import { corsHeaders, json, preflight } from '../_shared/cors.ts';
import { serviceClient, logSystemError } from '../_shared/clients.ts';
import { clientIp, isUuid, rateLimited } from '../_shared/ratelimit.ts';
import { computeOutput, DEFAULT_LIMITS, validateRequest, type Tool } from '../_shared/engine.ts';

Deno.serve(async (req) => {
  const pre = preflight(req); if (pre) return pre;
  if (req.method !== 'POST') return json(req, { error: 'method_not_allowed' }, 405);
  const db = serviceClient();
  try {
    const body = await req.json().catch(() => null);
    if (!body || !isUuid(body.sessionId) || !isUuid(body.eventId)) return json(req, { error: 'bad_request' }, 400);
    if (rateLimited(`spin:${clientIp(req)}`, 30) || rateLimited(`spin:${body.sessionId}`, 20)) return json(req, { error: 'rate_limited' }, 429);

    const { data: rows } = await db.from('website_settings').select('key,value').in('key', ['tools', 'system', 'features']);
    const cfg = Object.fromEntries((rows ?? []).map((r) => [r.key, r.value as Record<string, unknown>]));
    if (cfg.system?.maintenance === true) return json(req, { error: 'maintenance' }, 503);
    if (cfg.tools && cfg.tools[body.tool as string] === false) return json(req, { error: 'tool_disabled' }, 403);
    const limits = {
      maxParticipants: Number(cfg.system?.maxParticipants ?? DEFAULT_LIMITS.maxParticipants),
      maxNameLength: Number(cfg.system?.maxNameLength ?? DEFAULT_LIMITS.maxNameLength),
    };

    const v = validateRequest(String(body.tool), body.participants, body.config, limits);
    if (!v.ok) return json(req, { error: v.error }, 400);
    const output = computeOutput(body.tool as Tool, v.participants, v.config);

    const { data: id, error } = await db.rpc('store_spin', {
      p_session: body.sessionId,
      p_visitor: isUuid(body.visitorId) ? body.visitorId : null,
      p_tool: body.tool,
      p_participants: v.participants,
      p_config: v.config,
      p_output: output,
      p_event: body.eventId,
      p_ua: req.headers.get('user-agent') ?? '',
    });
    if (error) throw error;
    return json(req, { resultId: id, participants: v.participants, config: v.config, output });
  } catch (e) {
    await logSystemError(db, 'spin-submit', e);
    return new Response(JSON.stringify({ error: 'server_error' }), { status: 500, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } });
  }
});
