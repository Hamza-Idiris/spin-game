# Deployment

## 1. Supabase project
```bash
npm i -g supabase            # or use npx supabase
supabase login
supabase link --project-ref <ref>
supabase db push             # applies migrations 0001-0004
```
`0004_cron.sql` needs the `pg_cron` and `pg_net` extensions (enable under Database → Extensions if the push complains).

## 2. Secrets and functions
```bash
supabase secrets set ALLOWED_ORIGINS=https://your-site.vercel.app \
  CRON_SECRET=$(openssl rand -hex 32) BACKUP_ENCRYPTION_KEY=$(openssl rand -base64 32)
supabase functions deploy spin-submit track admin-api
supabase functions deploy backup --no-verify-jwt     # it authenticates itself (admin JWT or cron secret)
```
Write the `CRON_SECRET` and `BACKUP_ENCRYPTION_KEY` values down in a password manager.
Then in the SQL editor:
```sql
select vault.create_secret('https://<ref>.supabase.co', 'project_url');
select vault.create_secret('<same CRON_SECRET>', 'cron_secret');
```

## 3. Provision the first Admin (no credentials in code)
1. Supabase → Authentication → Users → **Add user** (e-mail + strong password, auto-confirm).
2. SQL editor: `select public.provision_admin('you@example.com');`
3. Authentication → Providers → Email: **disable "Allow new users to sign up"** (there is no public registration).
4. Authentication → URL Configuration: set Site URL to your domain and add `https://your-site/admin/reset` to Redirect URLs (password reset).

## 4. Frontend (Vercel or Netlify)
Root directory `frontend`, build `npm run build`, output `dist`. Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (public anon key only).
`vercel.json` / `public/_redirects` already provide SPA routing.

## 5. Verify
* Open the site, spin the wheel, export a PDF → Admin → Activities/Spin Results/Exports show them.
* Admin → Backup & Restore → **Create backup now** → Verify → Download.
* `select * from cron.job;` shows 3 jobs; after the first run check `cron.job_run_details`.

## Production security checklist
- [ ] Public sign-ups disabled; only provisioned admins exist; admin password is long and unique (turn on MFA in Supabase Auth for admins)
- [ ] `ALLOWED_ORIGINS` set to your real domain (not `*`)
- [ ] Service-role key exists only in Supabase (never in Vercel/Netlify env, never in git)
- [ ] `BACKUP_ENCRYPTION_KEY` set and stored outside Supabase; test a restore on staging
- [ ] RLS enabled on all tables (`select tablename from pg_tables where schemaname='public' and not rowsecurity;` returns nothing)
- [ ] `scripts/test-db.sh` passes on a scratch database
- [ ] Rate limiting also enabled at the edge (Cloudflare / Supabase) — the in-function limiter is per-instance
- [ ] Supabase project backups / PITR enabled (Pro plan) for the Auth schema
- [ ] Retention values set to match your privacy policy
- [ ] Optional: custom SMTP for Supabase Auth so password-reset e-mails are reliable
