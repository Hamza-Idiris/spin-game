# Database

PostgreSQL (Supabase). Migrations live in `supabase/migrations`:

| File | Purpose |
|---|---|
| `0001_schema.sql` | All tables, PKs/FKs, constraints, indexes |
| `0002_security_and_functions.sql` | RLS, `is_admin()`, `record_event`, `store_spin`, retention, admin analytics RPCs, `restore_from_json`, `provision_admin`, storage buckets |
| `0003_default_settings.sql` | Default website settings |
| `0004_cron.sql` | Supabase Cron jobs (daily + weekly backup, nightly retention) |

## Tables
`admin_users` · `website_settings` · `visitor_sessions` · `page_visits` · `activities` (central event feed, idempotent via `event_id`) ·
`spin_results` (+ `spin_participants`, `spin_groups`, `spin_group_members`, `team_matchups`, `spin_activities`) · `export_logs` ·
`admin_activity_logs` (settings before/after, admin identity) · `system_errors` · `backup_records` · `backup_settings`.

`activities` is the single timeline the Admin "Activities" page reads; the other tables hold the detailed records.
JSONB is only used for flexible data: `spin_results.config/output`, `activities.details`, settings values, audit before/after.

## Identity model (privacy)
* `visitor_id` – random UUID stored in the browser. It identifies a *browser*, not a person.
* `session_id` – random UUID that rotates after 30 min of inactivity.
No e-mail, name, IP address or fingerprint is stored. The dashboard labels the number "Anonymous browsers".

## Security model
* RLS is enabled on **every** table. Only `select` policies exist, and only for admins (`public.is_admin()`); `admin_users` also lets a user read their own row.
* There are **no** insert/update/delete policies. All writes go through Edge Functions using the service role, or `SECURITY DEFINER` functions whose `EXECUTE` is revoked from `anon`/`authenticated`.
* Anonymous visitors cannot read anything. They can only call `get_public_settings()` (non-secret site settings).
* Storage: `backups` bucket is private with no policies (service role only); `branding` bucket is public-read, admin-write.

## Tests
`scripts/test-db.sh` runs `supabase/tests/*.sql` on a scratch Postgres: idempotent events, normalized storage, export linking, a full
backup→wipe→restore round-trip, rollback of a corrupt restore, retention, and RLS/privilege checks as `anon`, a normal user and an admin.
