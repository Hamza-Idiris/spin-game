grant select on all tables in schema public to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated, service_role;  -- simulate Supabase default, then migration REVOKEs apply? (re-revoke below)
revoke all on function public.record_event(uuid,uuid,uuid,text,text,uuid,jsonb,text,text) from public, anon, authenticated;
revoke all on function public.store_spin(uuid,uuid,text,jsonb,jsonb,jsonb,uuid,text) from public, anon, authenticated;
revoke all on function public.restore_from_json(jsonb) from public, anon, authenticated;
revoke all on function public.provision_admin(text) from public, anon, authenticated;
revoke all on function public.apply_retention() from public, anon, authenticated;
insert into auth.users(id,email) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','admin@x.com'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','user@x.com');
select public.provision_admin('admin@x.com');
\echo --- anon
set role anon;
select 'anon spin_results visible:' , count(*) from spin_results;
select 'anon activities visible:' , count(*) from activities;
select 'anon settings rpc keys:' , count(*) from jsonb_object_keys(public.get_public_settings());
do $$ begin perform public.restore_from_json('{}'); exception when insufficient_privilege then raise notice 'PASS anon cannot restore'; end $$;
do $$ begin perform public.record_event(gen_random_uuid(),null,null,'x',null,null,null,null,null); exception when insufficient_privilege then raise notice 'PASS anon cannot call record_event directly'; end $$;
do $$ begin insert into website_settings values ('x','{}'); exception when insufficient_privilege then raise notice 'PASS anon cannot write settings'; end $$;
reset role;
\echo --- authenticated NON-admin
set role authenticated; set request.jwt.claim.sub = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
select 'user spin_results visible:', count(*) from spin_results;
select 'user admin_users visible:', count(*) from admin_users;
do $$ begin perform public.admin_overview(); exception when others then raise notice 'PASS non-admin blocked from analytics: %', sqlerrm; end $$;
reset role;
\echo --- ADMIN
set role authenticated; set request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select 'admin spin_results visible:', count(*) from spin_results;
select 'admin overview spins:', (public.admin_overview()->>'spins');
select 'admin timeseries rows (week):', count(*) from public.admin_timeseries('week', 12);
do $$ begin insert into website_settings values ('x','{}'); exception when others then raise notice 'PASS even admin cannot write tables directly (writes go via validated Edge Function): %', sqlerrm; end $$;
reset role;
