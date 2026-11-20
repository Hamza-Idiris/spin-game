# SPIN — One Platform. Every Random Possibility.

Premium randomization web app: Random Wheel, Team Matching, Group Generator, Group-by-Group Spin, Random Person Selection —
with an Admin dashboard (activity, results, sessions, exports, analytics, settings, backup & restore). English + Somali, Light + Dark.

## Stack
React 18 + TypeScript + Vite + Tailwind · React Router · React Hook Form + Zod · i18next · Recharts · Lucide ·
ExcelJS · jsPDF + AutoTable · Supabase (Auth, Postgres + RLS, Edge Functions, Storage, Cron).

## Quick start (works without Supabase)
```bash
cd frontend && npm install && npm run dev       # http://localhost:5173
```
Without keys all five tools work in **local mode** (results saved in the browser only) and the Admin area shows
"Supabase is not configured". Nothing pretends to be connected.

To connect Supabase: copy `.env.example` → `frontend/.env`, fill the two `VITE_` values, then follow **docs/DEPLOYMENT.md**.

## How fairness works
* All randomness uses `crypto.getRandomValues` with **rejection sampling** (no modulo bias) and a **Fisher–Yates** shuffle.
* With Supabase connected, `spin-submit` picks the winner / groups / matches **on the server**, stores them, and returns them. The wheel only animates to the returned index.
  If the server is unreachable the identical engine runs locally and the record is marked "saved on this device only".
* `supabase/functions/_shared/engine.ts` is the single source; `scripts/sync-shared.sh` copies it to `frontend/src/lib/shared/`.
* Results are reproducible from the stored record (participants + config + output) – not from a seed.

## Tools
| Tool | Highlights |
|---|---|
| Random Wheel | SVG wheel, multi-winner, keep/remove winners, sound toggle, fullscreen |
| Team Matching | 1v1 or N-way, BYE for odd counts, reveal one-by-one or all |
| Group Generator | by size or by count, always as even as possible, CSV import, duplicate removal with feedback |
| Group-by-Group | step-by-step reveal with draw animation, go back, final view |
| Random Person | N winners, keep/remove selected, select again |
All: copy, Excel (ExcelJS), PDF (jsPDF), print, local history (open/copy/export/delete/clear).

## Tests
```bash
cd frontend && npm test          # 48 tests: distribution/uniqueness, groups, BYE, exports, i18n, theme, sessions, history, backup crypto, settings validation, UI flows
./scripts/test-db.sh             # DB tests on a scratch Postgres (RLS, restore, retention) — see docs/DATABASE.md
```

## What was and was not verified here (be aware)
Verified: TypeScript build, 48 frontend tests, Edge Functions type-check (Deno), migrations + RLS + store/restore/retention on a real PostgreSQL 16 (with a stubbed Supabase auth/storage layer).
**Not** verified (needs your Supabase project / a browser): live Edge Function execution, pg_cron/pg_net schedules, Supabase Auth e-mails, Storage uploads/downloads,
real-device responsive/visual QA, and Somali wording review by a native speaker. Follow the "Verify" list in docs/DEPLOYMENT.md after deploying.

## Layout
`frontend/` app · `supabase/` migrations, functions, tests · `docs/` · `scripts/`

## Known limits
* PDF uses the built-in Latin font: Somali/English names are fine; Arabic/CJK names may not render in PDFs (Excel is fine).
* The in-app SQL backup is a logical data dump, not `pg_dump` (see docs/BACKUP.md).
* Auth users/uploaded files are not part of the in-app backup (see docs/BACKUP.md).
