-- SPIN schema v1
create extension if not exists pgcrypto;

create table public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now()
);

create table public.website_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table public.visitor_sessions (
  id uuid primary key,
  visitor_id uuid,
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  ended_at timestamptz,
  user_agent text,
  page_count int not null default 0,
  spin_count int not null default 0,
  export_count int not null default 0
);
create index visitor_sessions_created_idx on public.visitor_sessions (created_at desc);
create index visitor_sessions_visitor_idx on public.visitor_sessions (visitor_id);

create table public.page_visits (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.visitor_sessions(id) on delete cascade,
  path text not null,
  created_at timestamptz not null default now()
);
create index page_visits_session_idx on public.page_visits (session_id);
create index page_visits_created_idx on public.page_visits (created_at desc);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique,               -- idempotency key
  session_id uuid references public.visitor_sessions(id) on delete set null,
  type text not null,
  entity_id uuid,
  status text not null default 'success' check (status in ('success','failed','info')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index activities_created_idx on public.activities (created_at desc);
create index activities_type_idx on public.activities (type);
create index activities_session_idx on public.activities (session_id);

create table public.spin_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.visitor_sessions(id) on delete set null,
  tool text not null check (tool in ('wheel','teams','groups','groupspin','select')),
  config jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  participant_count int not null,
  group_count int not null default 0,
  match_count int not null default 0,
  winner_count int not null default 0,
  created_at timestamptz not null default now()
);
create index spin_results_created_idx on public.spin_results (created_at desc);
create index spin_results_session_idx on public.spin_results (session_id);
create index spin_results_tool_idx on public.spin_results (tool);

create table public.spin_activities (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.spin_results(id) on delete cascade,
  session_id uuid references public.visitor_sessions(id) on delete set null,
  tool text not null,
  status text not null default 'generated' check (status in ('generated','completed','failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
create index spin_activities_result_idx on public.spin_activities (result_id);

create table public.spin_participants (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.spin_results(id) on delete cascade,
  position int not null,
  name text not null,
  is_winner boolean not null default false
);
create index spin_participants_result_idx on public.spin_participants (result_id);

create table public.spin_groups (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.spin_results(id) on delete cascade,
  group_number int not null,
  size int not null
);
create index spin_groups_result_idx on public.spin_groups (result_id);

create table public.spin_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.spin_groups(id) on delete cascade,
  position int not null,
  name text not null
);
create index spin_group_members_group_idx on public.spin_group_members (group_id);

create table public.team_matchups (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.spin_results(id) on delete cascade,
  match_number int not null,
  teams text[] not null,
  is_bye boolean not null default false
);
create index team_matchups_result_idx on public.team_matchups (result_id);

create table public.export_logs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid unique,
  result_id uuid references public.spin_results(id) on delete set null,
  session_id uuid references public.visitor_sessions(id) on delete set null,
  format text not null check (format in ('pdf','excel')),
  status text not null default 'success' check (status in ('success','failed')),
  created_at timestamptz not null default now()
);
create index export_logs_created_idx on public.export_logs (created_at desc);
create index export_logs_result_idx on public.export_logs (result_id);

create table public.admin_activity_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid,                               -- no FK: audit trail must outlive the user
  admin_email text,
  action text not null,
  target text,
  previous jsonb,
  new jsonb,
  created_at timestamptz not null default now()
);
create index admin_activity_logs_created_idx on public.admin_activity_logs (created_at desc);

create table public.system_errors (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  message text not null,
  details jsonb not null default '{}'::jsonb,
  session_id uuid,
  created_at timestamptz not null default now()
);
create index system_errors_created_idx on public.system_errors (created_at desc);

create table public.backup_records (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('manual','daily','weekly','safety')),
  status text not null default 'running' check (status in ('running','completed','failed')),
  formats text[] not null default array['json','sql','zip'],
  file_name text,
  file_path text,
  storage_location text not null default 'supabase-storage:backups',
  size_bytes bigint,
  checksum_sha256 text,
  encrypted boolean not null default false,
  integrity_status text not null default 'unverified' check (integrity_status in ('unverified','verified','failed')),
  schema_version int not null default 1,
  table_counts jsonb,
  error text,
  retention_days int,                          -- null = indefinite
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index backup_records_created_idx on public.backup_records (created_at desc);

create table public.backup_settings (
  id int primary key default 1 check (id = 1),
  daily_enabled boolean not null default true,
  weekly_enabled boolean not null default true,
  retention_days int,                          -- null = indefinite
  notify_email text,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
insert into public.backup_settings (id, retention_days) values (1, 90) on conflict do nothing;
