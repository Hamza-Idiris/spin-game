# API (Supabase Edge Functions)

Base URL: `https://<ref>.supabase.co/functions/v1/<name>` · headers: `apikey` + `Authorization: Bearer <anon key>` (public) or the admin's access token (admin).

## `spin-submit` (public)
Chooses the result **on the server** with a CSPRNG (Fisher–Yates + rejection sampling) and stores it.
```json
{ "tool": "wheel|teams|groups", "participants": ["Ann","Bob"], "config": {"winners":1},
  "sessionId": "<uuid>", "visitorId": "<uuid>", "eventId": "<uuid>" }
```
Config: wheel `{winners}` · teams `{perMatch}` · groups `{mode:"size"|"count", value}`.
Returns `{ resultId, participants, config, output }`; `output` = `{winners,winnerIndexes}` | `{groups}` | `{matches}`.
Errors: `bad_request, too_few, too_many, invalid_config, tool_disabled, maintenance (503), rate_limited (429), server_error`.
The wheel animation lands on `output.winnerIndexes`; the animation never decides the winner.

## `track` (public)
`{ eventId, sessionId, visitorId, type, path?, entityId?, status?, details? }` — types: `page_visit, session_start, session_end, spin_started, spin_completed, export_pdf, export_excel, system_error`.
Idempotent on `eventId`; the browser queues failures in localStorage and retries.

## `admin-api` (admin JWT required, verified against `admin_users`)
* `{action:"settings_update", key, value}` — validated server-side (`_shared/settings.ts`), writes audit log with previous/new values.
* `{action:"log_auth", event:"login"|"logout"}`.

## `backup` (admin JWT **or** `x-cron-secret`)
`create` · `download` (5-minute signed URL) · `verify` · `inspect` · `delete` (`ids[]`) · `restore` (`{id, confirm:"RESTORE"}`) · `update_settings`.
Cron may only call `create`.

## Rate limiting
In-memory sliding window per IP and per session inside each function instance (30 spins/min/IP, 120 events/min/IP). For strong guarantees also enable
Supabase/Cloudflare rate limiting at the edge (see DEPLOYMENT.md checklist).
