\set ON_ERROR_STOP on
-- 1 idempotent event + session counters
select public.record_event('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333','page_visit','/tools',null,'{}','success','UA') as first;
select public.record_event('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333','page_visit','/tools',null,'{}','success','UA') as duplicate;
select page_count from visitor_sessions;
-- 2 store a groups spin + a wheel spin + a teams spin
select public.store_spin('22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333','groups','["A","B","C","D","E"]','{"mode":"size","value":2}','{"groups":[["A","B"],["C","D"],["E"]]}','44444444-4444-4444-8444-444444444444','UA') as groups_id \gset
select public.store_spin('22222222-2222-4222-8222-222222222222',null,'wheel','["A","B","C"]','{"winners":1}','{"winners":["B"],"winnerIndexes":[1]}',gen_random_uuid(),'UA');
select public.store_spin('22222222-2222-4222-8222-222222222222',null,'teams','["A","B","C"]','{"perMatch":2}','{"matches":[{"teams":["A","B"]},{"teams":["C"],"bye":true}]}',gen_random_uuid(),'UA');
select (select count(*) from spin_results) results, (select count(*) from spin_groups) groups, (select count(*) from spin_group_members) members, (select count(*) from team_matchups) matchups, (select count(*) from spin_participants where is_winner) winners;
select spin_count from visitor_sessions;
-- 3 export log linked to result, then spin_completed
select public.record_event(gen_random_uuid(),'22222222-2222-4222-8222-222222222222',null,'export_pdf',null,:'groups_id',null,'success','UA');
select public.record_event(gen_random_uuid(),'22222222-2222-4222-8222-222222222222',null,'spin_completed',null,:'groups_id',null,'success','UA');
select format, result_id is not null as linked from export_logs;
select status from spin_activities where result_id = :'groups_id';
select export_count from visitor_sessions;
-- 4 restore round trip: snapshot -> wipe -> restore -> counts equal
create temp table snap as select jsonb_build_object(
 'website_settings',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from website_settings t),
 'backup_settings',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from backup_settings t),
 'visitor_sessions',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from visitor_sessions t),
 'spin_results',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from spin_results t),
 'activities',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from activities t),
 'page_visits',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from page_visits t),
 'spin_activities',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from spin_activities t),
 'export_logs',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from export_logs t),
 'spin_participants',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from spin_participants t),
 'spin_groups',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from spin_groups t),
 'spin_group_members',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from spin_group_members t),
 'team_matchups',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from team_matchups t),
 'system_errors','[]'::jsonb,'admin_activity_logs','[]'::jsonb) as p;
select (select count(*) from activities) as before_activities, (select count(*) from team_matchups) as before_matchups;
delete from spin_results; delete from activities;
select count(*) as after_wipe from spin_results;
select public.restore_from_json(p) from snap;
select (select count(*) from activities) as restored_activities, (select count(*) from team_matchups) as restored_matchups, (select count(*) from spin_group_members) as restored_members;
-- 5 a CORRUPT payload rolls back everything (production untouched)
do $$ begin
  begin perform public.restore_from_json('{"website_settings":[{"key":"x","value":{}}],"spin_results":[{"id":"not-a-uuid"}]}'::jsonb); raise exception 'should have failed';
  exception when others then if sqlerrm = 'should have failed' then raise; end if; raise notice 'PASS corrupt restore rejected: %', sqlerrm; end;
end $$;
select (select count(*) from spin_results) as results_still_there;
-- 6 retention
update website_settings set value = jsonb_set(value,'{activityRetentionDays}','1') where key='system';
update activities set created_at = now() - interval '5 days';
select public.apply_retention(); select count(*) as activities_after_retention from activities;
