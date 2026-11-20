-- Row Level Security, admin check, event recording and admin RPCs

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where id = auth.uid());
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- RLS: every table locked down. Public visitors have NO direct table access;
-- they only talk to Edge Functions that use the service role.
do $$
declare t text;
begin
  foreach t in array array['admin_users','website_settings','visitor_sessions','page_visits','activities',
    'spin_results','spin_activities','spin_participants','spin_groups','spin_group_members','team_matchups',
    'export_logs','admin_activity_logs','system_errors','backup_records','backup_settings'] loop
    execute format('alter table public.%I enable row level security', t);
    if t = 'admin_users' then
      execute 'create policy admin_users_select on public.admin_users for select to authenticated using (id = auth.uid() or public.is_admin())';
    else
      execute format('create policy %I on public.%I for select to authenticated using (public.is_admin())', t || '_admin_select', t);
    end if;
  end loop;
end $$;
-- No insert/update/delete policies exist: all writes go through service-role Edge Functions / SECURITY DEFINER functions.

-- Public, read-only settings (no secrets live in website_settings)
create or replace function public.get_public_settings() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
  from public.website_settings
  where key in ('general','tools','appearance','features','system');
$$;
grant execute on function public.get_public_settings() to anon, authenticated;

-- Idempotent central event recorder (called by Edge Functions only)
create or replace function public.record_event(
  p_event uuid, p_session uuid, p_visitor uuid, p_type text, p_path text,
  p_entity uuid, p_details jsonb, p_status text, p_ua text
) returns boolean language plpgsql security definer set search_path = public as $$
declare ins uuid;
begin
  if p_session is not null then
    insert into visitor_sessions (id, visitor_id, user_agent) values (p_session, p_visitor, left(p_ua, 200))
    on conflict (id) do nothing;
  end if;
  insert into activities (event_id, session_id, type, entity_id, status, details)
  values (p_event, p_session, p_type, p_entity, coalesce(p_status, 'success'), coalesce(p_details, '{}'::jsonb))
  on conflict (event_id) do nothing returning id into ins;
  if ins is null then return false; end if;

  if p_session is not null then
    update visitor_sessions set
      last_activity_at = now(),
      page_count = page_count + (p_type = 'page_visit')::int,
      spin_count = spin_count + (p_type in ('winners_selected','group_generated','teams_matched'))::int,
      export_count = export_count + (p_type in ('export_pdf','export_excel'))::int,
      ended_at = case when p_type = 'session_end' then now() else null end
    where id = p_session;
  end if;

  if p_type = 'page_visit' and p_session is not null then
    insert into page_visits (session_id, path) values (p_session, left(coalesce(p_path, '/'), 200));
  elsif p_type in ('export_pdf','export_excel') then
    insert into export_logs (event_id, result_id, session_id, format, status)
    values (p_event, (select id from spin_results where id = p_entity), p_session,
            case when p_type = 'export_pdf' then 'pdf' else 'excel' end,
            case when coalesce(p_status,'success') = 'failed' then 'failed' else 'success' end);
  elsif p_type = 'spin_completed' and p_entity is not null then
    update spin_activities set status = 'completed', completed_at = now()
    where result_id = p_entity and session_id is not distinct from p_session;
  end if;
  return true;
end $$;

-- Stores a full spin result in normalized tables (atomic)
create or replace function public.store_spin(
  p_session uuid, p_visitor uuid, p_tool text, p_participants jsonb, p_config jsonb, p_output jsonb, p_event uuid, p_ua text
) returns uuid language plpgsql security definer set search_path = public as $$
declare rid uuid; gid uuid; g jsonb; gi int := 0; m jsonb; mi int := 0; etype text;
begin
  insert into visitor_sessions (id, visitor_id, user_agent) values (p_session, p_visitor, left(p_ua, 200)) on conflict (id) do nothing;
  insert into spin_results (session_id, tool, config, output, participant_count, group_count, match_count, winner_count)
  values (p_session, p_tool, p_config, p_output, jsonb_array_length(p_participants),
          coalesce(jsonb_array_length(p_output->'groups'), 0), coalesce(jsonb_array_length(p_output->'matches'), 0),
          coalesce(jsonb_array_length(p_output->'winners'), 0))
  returning id into rid;

  insert into spin_participants (result_id, position, name, is_winner)
  select rid, (ord - 1)::int, val #>> '{}',
         coalesce((p_output->'winnerIndexes') @> to_jsonb((ord - 1)::int), false)
  from jsonb_array_elements(p_participants) with ordinality as t(val, ord);

  for g in select * from jsonb_array_elements(coalesce(p_output->'groups', '[]'::jsonb)) loop
    gi := gi + 1;
    insert into spin_groups (result_id, group_number, size) values (rid, gi, jsonb_array_length(g)) returning id into gid;
    insert into spin_group_members (group_id, position, name)
    select gid, (ord - 1)::int, val #>> '{}' from jsonb_array_elements(g) with ordinality as t(val, ord);
  end loop;

  for m in select * from jsonb_array_elements(coalesce(p_output->'matches', '[]'::jsonb)) loop
    mi := mi + 1;
    insert into team_matchups (result_id, match_number, teams, is_bye)
    values (rid, mi, array(select jsonb_array_elements_text(m->'teams')), coalesce((m->>'bye')::boolean, false));
  end loop;

  insert into spin_activities (result_id, session_id, tool) values (rid, p_session, p_tool);
  etype := case p_tool when 'teams' then 'teams_matched' when 'groups' then 'group_generated'
                       when 'groupspin' then 'group_generated' else 'winners_selected' end;
  perform record_event(p_event, p_session, p_visitor, etype, null, rid, jsonb_build_object('tool', p_tool, 'participants', jsonb_array_length(p_participants)), 'success', p_ua);
  return rid;
end $$;

-- Retention (run daily by cron). 0 = keep forever.
create or replace function public.apply_retention() returns void
language plpgsql security definer set search_path = public as $$
declare s jsonb; a int; ss int; r int;
begin
  select value into s from website_settings where key = 'system';
  a := coalesce((s->>'activityRetentionDays')::int, 0);
  ss := coalesce((s->>'sessionRetentionDays')::int, 0);
  r := coalesce((s->>'resultsRetentionDays')::int, 0);
  if a > 0 then
    delete from activities where created_at < now() - make_interval(days => a);
    delete from page_visits where created_at < now() - make_interval(days => a);
    delete from system_errors where created_at < now() - make_interval(days => a);
  end if;
  if r > 0 then delete from spin_results where created_at < now() - make_interval(days => r); end if;
  if ss > 0 then delete from visitor_sessions where last_activity_at < now() - make_interval(days => ss); end if;
end $$;

-- Admin analytics
create or replace function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare res jsonb;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  select jsonb_build_object(
    'visitors', (select count(distinct visitor_id) from visitor_sessions),
    'sessions', (select count(*) from visitor_sessions),
    'activeSessions', (select count(*) from visitor_sessions where ended_at is null and last_activity_at > now() - interval '30 minutes'),
    'spins', (select count(*) from spin_results),
    'groups', (select count(*) from spin_groups),
    'matchups', (select count(*) from team_matchups),
    'winners', (select count(*) from spin_participants where is_winner),
    'pdfExports', (select count(*) from export_logs where format = 'pdf' and status = 'success'),
    'excelExports', (select count(*) from export_logs where format = 'excel' and status = 'success'),
    'failedBackups7d', (select count(*) from backup_records where status = 'failed' and created_at > now() - interval '7 days'),
    'toolDistribution', (select coalesce(jsonb_object_agg(tool, c), '{}'::jsonb) from (select tool, count(*) c from spin_results group by tool) x)
  ) into res;
  return res;
end $$;
grant execute on function public.admin_overview() to authenticated;

create or replace function public.admin_timeseries(p_bucket text, p_count int)
returns table (bucket date, sessions bigint, spins bigint, exports bigint, activities bigint)
language plpgsql stable security definer set search_path = public as $$
declare step interval; start_ts timestamptz;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  if p_bucket not in ('day','week','month') or p_count < 1 or p_count > 366 then raise exception 'bad arguments'; end if;
  step := ('1 ' || p_bucket)::interval;
  start_ts := date_trunc(p_bucket, now()) - step * (p_count - 1);
  return query
  select g::date,
    (select count(*) from visitor_sessions s where date_trunc(p_bucket, s.created_at) = g),
    (select count(*) from spin_results r where date_trunc(p_bucket, r.created_at) = g),
    (select count(*) from export_logs e where date_trunc(p_bucket, e.created_at) = g),
    (select count(*) from activities a where date_trunc(p_bucket, a.created_at) = g)
  from generate_series(start_ts, date_trunc(p_bucket, now()), step) g order by 1;
end $$;
grant execute on function public.admin_timeseries(text, int) to authenticated;

-- Restore (staged + atomic): the whole function is one transaction, so any failure rolls back.
create or replace function public.restore_from_json(p_payload jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  del text[] := array['spin_group_members','spin_groups','team_matchups','spin_participants','spin_activities','export_logs',
                      'page_visits','activities','spin_results','visitor_sessions','system_errors','admin_activity_logs','website_settings','backup_settings'];
  ins text[] := array['website_settings','backup_settings','visitor_sessions','spin_results','activities','page_visits','spin_activities',
                      'export_logs','spin_participants','spin_groups','spin_group_members','team_matchups','system_errors','admin_activity_logs'];
  t text; expected int; got int; counts jsonb := '{}'::jsonb;
begin
  foreach t in array del loop execute format('delete from public.%I where true', t); end loop;
  foreach t in array ins loop
    if p_payload->t is not null and jsonb_typeof(p_payload->t) <> 'array' then raise exception 'Invalid payload for table %', t; end if;
    expected := coalesce(jsonb_array_length(p_payload->t), 0);
    if expected > 0 then
      execute format('insert into public.%I select * from jsonb_populate_recordset(null::public.%I, $1)', t, t) using p_payload->t;
    end if;
    execute format('select count(*) from public.%I', t) into got;
    if got <> expected then raise exception 'Validation failed for %: expected %, got %', t, expected, got; end if;
    counts := counts || jsonb_build_object(t, got);
  end loop;
  return counts;
end $$;

-- Admin provisioning: run from the SQL editor only (see docs/DEPLOYMENT.md)
create or replace function public.provision_admin(p_email text) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into admin_users (id, email) select id, email from auth.users where lower(email) = lower(p_email)
  on conflict (id) do nothing;
  if not exists (select 1 from admin_users where lower(email) = lower(p_email)) then
    raise exception 'No auth user with email %. Create the user in Supabase Auth first.', p_email;
  end if;
end $$;

-- Lock down privileged functions: service role / postgres only
revoke all on function public.record_event(uuid,uuid,uuid,text,text,uuid,jsonb,text,text) from public, anon, authenticated;
revoke all on function public.store_spin(uuid,uuid,text,jsonb,jsonb,jsonb,uuid,text) from public, anon, authenticated;
revoke all on function public.apply_retention() from public, anon, authenticated;
revoke all on function public.restore_from_json(jsonb) from public, anon, authenticated;
revoke all on function public.provision_admin(text) from public, anon, authenticated;
grant execute on function public.record_event(uuid,uuid,uuid,text,text,uuid,jsonb,text,text) to service_role;
grant execute on function public.store_spin(uuid,uuid,text,jsonb,jsonb,jsonb,uuid,text) to service_role;
grant execute on function public.restore_from_json(jsonb) to service_role;

-- Storage: private backups bucket (no policies => service role only), public branding bucket (admin-writable)
insert into storage.buckets (id, name, public) values ('backups', 'backups', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('branding', 'branding', true) on conflict (id) do nothing;
create policy branding_admin_write on storage.objects for insert to authenticated with check (bucket_id = 'branding' and public.is_admin());
create policy branding_admin_update on storage.objects for update to authenticated using (bucket_id = 'branding' and public.is_admin());
create policy branding_admin_delete on storage.objects for delete to authenticated using (bucket_id = 'branding' and public.is_admin());
