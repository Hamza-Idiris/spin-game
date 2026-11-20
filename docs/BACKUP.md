# Backup & Restore

## What a backup contains
One **ZIP package** per backup, optionally AES-256-GCM encrypted (`.zip.enc`), containing:
* `data.json` – structured JSON of all application tables
* `dump.sql` – logical SQL data dump (`INSERT … jsonb_populate_recordset`), restorable with `psql`
* `manifest.json` – app, schema version, kind, per-table row counts
* `checksums.json` – SHA-256 of each inner file; the outer file's SHA-256 is stored in `backup_records`

Tables: website_settings, backup_settings, visitor_sessions, page_visits, activities, spin_activities, spin_results, spin_participants, spin_groups,
spin_group_members, team_matchups, export_logs, system_errors, admin_activity_logs (+ `admin_users` and `backup_records` for reference).

**Not included, by design:** Supabase Auth users and uploaded branding files. Back them up with Supabase's own project backups (Pro plan: daily backups / PITR)
and the optional `scripts/pg_dump_offsite.sh`. `admin_users` and `backup_records` are never overwritten by a restore.

## Honest note on "PostgreSQL dump"
Edge Functions cannot run `pg_dump`. The in-app SQL file is a logical data dump of the app tables. For a true `pg_dump`
(including the `auth` schema) run `scripts/pg_dump_offsite.sh` from CI or a server and store it elsewhere.

## Storage
Private Supabase Storage bucket `backups` (a separate service from the Postgres database, so a database failure does not take the copies with it).
For stronger separation mirror the bucket to another provider (S3/Backblaze) with a nightly `rclone sync`, and keep the `pg_dump` off-site.
Encryption: set `BACKUP_ENCRYPTION_KEY` (`openssl rand -base64 32`). **Keep this key somewhere safe outside Supabase – without it encrypted backups cannot be restored.**
If the key is missing, backups are created unencrypted and the dashboard shows "Not encrypted".

## Schedules
`0004_cron.sql` creates (pg_cron + pg_net, run by Supabase, independent of any browser):
* daily 02:00 UTC · weekly Sunday 03:00 UTC · nightly retention 03:30 UTC
Setup (once, SQL editor): `select vault.create_secret('https://<ref>.supabase.co','project_url'); select vault.create_secret('<CRON_SECRET>','cron_secret');`
Daily/weekly can be switched off in the dashboard (Backup & Restore → Automatic backups).

## Retention
30 / 90 / 180 days, 1 year, or indefinite, chosen in the dashboard. Each backup stores `expires_at`; expired files are deleted after each new backup.

## Restore procedure (what the code does)
1. Download file and verify the outer SHA-256 · 2. decrypt, unzip, verify inner checksums · 3. check manifest (`app=spin`, schema version ≤ current)
4. Admin must type `RESTORE` · 5. create a **safety backup** (kept 30 days) · 6. call `restore_from_json` – a single database transaction that wipes and reloads the application tables
7. inside the same transaction every table's row count is compared with the manifest; any mismatch raises an error and **PostgreSQL rolls everything back** · 8. log the operation.
A corrupted, tampered or incompatible backup is rejected at steps 1–3, before anything is touched. Tip: enable Maintenance mode first for a quiet restore.

## Failure notifications
A failed job writes `backup_records.status='failed'`, a `system_errors` row and a `backup_failed` activity; the Overview page and Backup page show a red banner.
Optionally set `RESEND_API_KEY` + `ADMIN_NOTIFY_EMAIL` for e-mail alerts.

## Test your restore
Every quarter: create a backup, restore it into a **staging** project, and check the counts. A backup you never restored is only a hope.
