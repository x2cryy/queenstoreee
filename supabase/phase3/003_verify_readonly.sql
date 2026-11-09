-- Read-only checks after running 001. Changes nothing.
select json_build_object(
  'account_status_column', (select count(*) from information_schema.columns
     where table_schema='public' and table_name='profiles' and column_name='account_status'),
  'triggers', (select json_agg(json_build_object('table', c.relname, 'trigger', t.tgname) order by c.relname, t.tgname)
     from pg_trigger t join pg_class c on c.oid = t.tgrelid
     where not t.tgisinternal and c.relname in ('profiles','admin_users')),
  'auth_users_triggers', (select json_agg(t.tgname) from pg_trigger t
     where not t.tgisinternal and t.tgrelid = 'auth.users'::regclass),
  'rpc_functions', (select json_agg(proname order by proname) from pg_proc
     where pronamespace='public'::regnamespace and proname like 'admin\_%' escape '\'),
  'owners', (select count(*) from public.admin_users where role='owner'),
  -- permission keys that existing RLS policies refer to: each must be in the 16-key whitelist
  'permission_keys_used_in_policies', (select json_agg(distinct m[1]) from pg_policies p,
     lateral regexp_matches(coalesce(p.qual,'') || ' ' || coalesce(p.with_check,''),
       'has_permission\(''([a-z_]+)''', 'g') as m
     where p.schemaname in ('public','storage'))
);
