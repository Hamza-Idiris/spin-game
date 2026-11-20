-- Scheduled jobs (Supabase Cron = pg_cron + pg_net). Backups run server-side, independent of any browser.
-- Prerequisites (once, in the SQL editor), see docs/BACKUP.md:
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<same value as the CRON_SECRET function secret>', 'cron_secret');
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule('spin-backup-daily', '0 2 * * *', $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/backup',
    headers := jsonb_build_object('Content-Type','application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body := '{"action":"create","kind":"daily"}'::jsonb);
$job$);

select cron.schedule('spin-backup-weekly', '0 3 * * 0', $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/backup',
    headers := jsonb_build_object('Content-Type','application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body := '{"action":"create","kind":"weekly"}'::jsonb);
$job$);

select cron.schedule('spin-retention', '30 3 * * *', $job$ select public.apply_retention(); $job$);
