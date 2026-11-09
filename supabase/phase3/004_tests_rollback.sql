-- QUEEN STORE — Phase 3 database security tests (UNTESTED script: review before running).
-- Creates throw-away users inside a DO block, runs the checks as each role, then ENDS WITH A
-- DELIBERATE ERROR carrying the report. That error rolls back everything the test created,
-- so no data remains. Copy the report text from the error message and send it back.
-- Run it only AFTER 001 has been applied.

create or replace function pg_temp.as_user(uid uuid, stmt text) returns text
language plpgsql as $$
declare n bigint;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid::text, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    execute stmt;
    get diagnostics n = row_count;
    reset role;
    return 'OK rows=' || n;
  exception when others then
    reset role;
    return 'ERR ' || sqlstate || ' ' || sqlerrm;
  end;
end $$;

create or replace function pg_temp.line(test text, expected text, actual text) returns text
language sql as $$
  select format(E'%s  %s\n      expected: %s\n      actual:   %s\n',
    case when actual like expected || '%' then 'PASS' else 'FAIL' end, test, expected, actual);
$$;

do $$
declare
  o  uuid := '00000000-0000-4000-8000-0000000000a1';  -- owner
  cu uuid := '00000000-0000-4000-8000-0000000000b1';  -- customer
  sp uuid := '00000000-0000-4000-8000-0000000000c1';  -- staff: products only
  sc uuid := '00000000-0000-4000-8000-0000000000c2';  -- staff: customers only
  r text := E'PHASE 3 TEST REPORT\n';
  a text;
begin
  insert into auth.users (id, email, email_confirmed_at) values
    (o,  't_owner@test.local',     now()),
    (cu, 't_customer@test.local',  now()),
    (sp, 't_products@test.local',  now()),
    (sc, 't_customers@test.local', now());
  insert into public.admin_users (user_id, role, permissions) values
    (o,  'owner', '{}'),
    (sp, 'staff', '{"products":true}'),
    (sc, 'staff', '{"customers":true}');

  r := r || pg_temp.line('T01 signup trigger created 4 profiles', '4',
         (select count(*)::text from public.profiles where id in (o, cu, sp, sc)));

  -- customer
  a := pg_temp.as_user(cu, format($q$update public.profiles set full_name='Test' where id=%L$q$, cu));
  r := r || pg_temp.line('T02 customer edits own name', 'OK rows=1', a);
  a := pg_temp.as_user(cu, format($q$update public.profiles set account_status='blocked' where id=%L$q$, cu));
  r := r || pg_temp.line('T03 customer cannot change account_status', 'ERR 42501', a);
  a := pg_temp.as_user(cu, format($q$insert into public.admin_users(user_id, role) values (%L,'staff')$q$, cu));
  r := r || pg_temp.line('T04 customer cannot make self admin (insert)', 'ERR 42501', a);
  a := pg_temp.as_user(cu, format($q$update public.admin_users set role='owner' where user_id=%L$q$, cu));
  r := r || pg_temp.line('T05 customer cannot make self owner (update)', 'OK rows=0', a);
  a := pg_temp.as_user(cu, format($q$select public.admin_grant_staff('t_customer@test.local','{}')$q$));
  r := r || pg_temp.line('T06 customer cannot call admin_grant_staff', 'ERR 42501', a);
  a := pg_temp.as_user(cu, format($q$select 1 from public.profiles where id=%L$q$, sc));
  r := r || pg_temp.line('T07 customer cannot read another profile', 'OK rows=0', a);
  a := pg_temp.as_user(cu, format($q$select 1 from public.admin_users where user_id=%L$q$, o));
  r := r || pg_temp.line('T08 customer cannot see the owner row', 'OK rows=0', a);

  -- staff, products only
  a := pg_temp.as_user(sp, $q$select 1 where public.has_permission('products')$q$);
  r := r || pg_temp.line('T09 products-staff has products', 'OK rows=1', a);
  a := pg_temp.as_user(sp, $q$select 1 where public.has_permission('orders')$q$);
  r := r || pg_temp.line('T10 products-staff has NO orders', 'OK rows=0', a);
  a := pg_temp.as_user(sp, $q$select 1 where public.has_permission('personal_debts') or public.has_permission('costs') or public.has_permission('settings')$q$);
  r := r || pg_temp.line('T11 products-staff has NO debts/costs/settings', 'OK rows=0', a);
  a := pg_temp.as_user(sp, format($q$select 1 from public.profiles where id=%L$q$, cu));
  r := r || pg_temp.line('T12 products-staff cannot read customer profiles', 'OK rows=0', a);
  a := pg_temp.as_user(sp, format($q$select public.admin_set_staff_permissions(%L, '{"costs":true,"admins":true}')$q$, sp));
  r := r || pg_temp.line('T13 staff cannot grant self permissions', 'ERR 42501', a);
  a := pg_temp.as_user(sp, $q$select * from public.admin_list_staff()$q$);
  r := r || pg_temp.line('T14 staff cannot list staff', 'ERR 42501', a);
  a := pg_temp.as_user(sp, format($q$update public.admin_users set permissions='{"costs":true}' where user_id=%L$q$, sp));
  r := r || pg_temp.line('T15 staff cannot edit own permissions directly', 'OK rows=0', a);
  a := pg_temp.as_user(sp, format($q$delete from public.admin_users where user_id=%L$q$, o));
  r := r || pg_temp.line('T16 staff cannot delete the owner', 'OK rows=0', a);

  -- staff with the customers permission
  a := pg_temp.as_user(sc, format($q$select 1 from public.profiles where id=%L$q$, cu));
  r := r || pg_temp.line('T17 customers-staff can read customer profiles', 'OK rows=1', a);
  a := pg_temp.as_user(sc, format($q$update public.profiles set account_status='blocked' where id=%L$q$, cu));
  r := r || pg_temp.line('T18 customers-staff can change account_status', 'OK rows=1', a);

  -- owner
  a := pg_temp.as_user(o, format($q$select public.admin_set_staff_permissions(%L, '{"products":true,"orders":true}')$q$, sp));
  r := r || pg_temp.line('T19 owner sets staff permissions', 'OK rows=1', a);
  a := pg_temp.as_user(sp, $q$select 1 where public.has_permission('orders')$q$);
  r := r || pg_temp.line('T20 staff now has orders', 'OK rows=1', a);
  a := pg_temp.as_user(sp, $q$select 1 where public.has_permission('costs')$q$);
  r := r || pg_temp.line('T21 granting orders did NOT grant costs', 'OK rows=0', a);
  a := pg_temp.as_user(o, format($q$select public.admin_set_staff_permissions(%L, '{"hack":true}')$q$, sp));
  r := r || pg_temp.line('T22 owner cannot set an unknown permission', 'ERR 22023', a);
  a := pg_temp.as_user(o, format($q$select public.admin_set_staff_permissions(%L, '{"orders":"yes"}')$q$, sp));
  r := r || pg_temp.line('T23 owner cannot set a non-boolean permission', 'ERR 22023', a);
  a := pg_temp.as_user(o, format($q$insert into public.admin_users(user_id, role) values (%L,'owner')$q$, cu));
  r := r || pg_temp.line('T24 even the owner cannot create an owner through the API', 'ERR 42501', a);
  a := pg_temp.as_user(o, format($q$select public.admin_revoke_staff(%L)$q$, o));
  r := r || pg_temp.line('T25 owner row cannot be revoked', 'ERR P0002', a);
  a := pg_temp.as_user(o, $q$select public.admin_grant_staff('t_customer@test.local', '{"products":true}')$q$);
  r := r || pg_temp.line('T26 owner promotes a confirmed account to staff', 'OK rows=1', a);
  r := r || pg_temp.line('T27 promoted account has role staff', 'staff',
         coalesce((select role from public.admin_users where user_id = cu), 'none'));

  raise exception E'%\n(This error is intentional: it rolls back all test data.)', r;
end $$;
