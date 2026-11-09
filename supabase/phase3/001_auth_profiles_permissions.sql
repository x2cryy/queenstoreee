-- QUEEN STORE — Phase 3: accounts, profiles, staff permissions
-- ADDITIVE ONLY: no table/policy/data is dropped or recreated. Runs as one transaction:
-- if anything fails, nothing is applied. Safe to run twice.
-- NOT executed by Claude. Review, then run once in the Supabase SQL Editor.

begin;

-- 0. Stop early if the expected Phase 2 objects are missing
do $$
begin
  if to_regclass('public.profiles') is null or to_regclass('public.admin_users') is null then
    raise exception 'profiles or admin_users is missing - aborting';
  end if;
  if to_regprocedure('public.has_permission(text)') is null
     or to_regprocedure('public.is_owner()') is null then
    raise exception 'has_permission/is_owner is missing - aborting';
  end if;
end $$;

-- 1. Account status on profiles (email and last sign-in stay in auth.users)
alter table public.profiles
  add column if not exists account_status text not null default 'active';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_account_status_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_account_status_check
      check (account_status in ('active', 'blocked'));
  end if;
end $$;

-- 2. profiles_update_own lets a user write ANY column of their own row.
--    This guard makes account_status changeable only by service-level code or
--    by someone holding the 'customers' permission.
create or replace function public.guard_profile_protected_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and not public.has_permission('customers') then
    if tg_op = 'INSERT' then
      if new.account_status is distinct from 'active' then
        raise exception 'account_status is protected' using errcode = '42501';
      end if;
    elsif new.account_status is distinct from old.account_status then
      raise exception 'account_status is protected' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_profile_protected on public.profiles;
create trigger trg_guard_profile_protected
  before insert or update on public.profiles
  for each row execute function public.guard_profile_protected_columns();

-- 3. Create the profile automatically when an account is created.
--    Only name and phone are read from user metadata. Role/permissions never come from it.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 80), ''),
    nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'phone', '')), 20), '')
  )
  on conflict (id) do nothing;
  return new;
exception when others then
  -- never block sign-up because of the profile row; the app re-creates it on first sign-in
  raise warning 'handle_new_user failed for %: %', new.id, sqlerrm;
  return new;
end $$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: accounts that already exist without a profile row (inserts only)
insert into public.profiles (id)
select u.id from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

-- 4. Owner / staff rows can never be created or removed through the API.
--    An owner can only be assigned from the SQL Editor (no end-user session there).
create or replace function public.guard_admin_users_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    if tg_op = 'DELETE' then
      if old.role = 'owner' then
        raise exception 'owner cannot be removed through the API' using errcode = '42501';
      end if;
      return old;
    end if;
    if new.role = 'owner' and (tg_op = 'INSERT' or old.role is distinct from 'owner') then
      raise exception 'owner can only be assigned from the SQL editor' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and old.role = 'owner' and new.role is distinct from 'owner' then
      raise exception 'owner role is protected' using errcode = '42501';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

drop trigger if exists trg_guard_admin_users_write on public.admin_users;
create trigger trg_guard_admin_users_write
  before insert or update or delete on public.admin_users
  for each row execute function public.guard_admin_users_write();

-- 5. Permission whitelist + validation (keeps has_permission()'s boolean cast safe)
create or replace function public.admin_permission_keys()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['dashboard','products','inventory','orders','customers','chats',
               'personal_debts','store_debts','installments','marketing','content',
               'reports','costs','settings','activity_logs','admins']::text[];
$$;

create or replace function public.admin_sanitize_permissions(p jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  k text;
  v jsonb;
  res jsonb := '{}'::jsonb;
begin
  if p is null then return '{}'::jsonb; end if;
  if jsonb_typeof(p) <> 'object' then
    raise exception 'permissions must be a JSON object' using errcode = '22023';
  end if;
  for k, v in select key, value from jsonb_each(p) loop
    if not (k = any (public.admin_permission_keys())) then
      raise exception 'unknown permission: %', k using errcode = '22023';
    end if;
    if jsonb_typeof(v) <> 'boolean' then
      raise exception 'permission % must be true or false', k using errcode = '22023';
    end if;
    res := res || jsonb_build_object(k, v);
  end loop;
  return res;
end $$;

-- 6. Owner-only staff management. Each function re-checks is_owner() itself.
--    Staff role value is 'staff' (the existing column default).
create or replace function public.admin_grant_staff(p_email text, p_permissions jsonb default '{}'::jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_perms jsonb;
begin
  if not public.is_owner() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  v_perms := public.admin_sanitize_permissions(p_permissions);

  select u.id into v_id
  from auth.users u
  where lower(u.email) = lower(btrim(p_email)) and u.email_confirmed_at is not null
  limit 1;
  if v_id is null then
    raise exception 'user not found or email not confirmed' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.admin_users a where a.user_id = v_id) then
    raise exception 'user is already an admin' using errcode = '23505';
  end if;

  insert into public.admin_users (user_id, role, permissions)
  values (v_id, 'staff', v_perms);
  return v_id;
end $$;

create or replace function public.admin_set_staff_permissions(p_user_id uuid, p_permissions jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_perms jsonb;
begin
  if not public.is_owner() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  v_perms := public.admin_sanitize_permissions(p_permissions);
  update public.admin_users
     set permissions = v_perms, updated_at = now()
   where user_id = p_user_id and role <> 'owner';
  if not found then
    raise exception 'staff member not found' using errcode = 'P0002';
  end if;
end $$;

create or replace function public.admin_revoke_staff(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_owner() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  delete from public.admin_users where user_id = p_user_id and role <> 'owner';
  if not found then
    raise exception 'staff member not found' using errcode = 'P0002';
  end if;
end $$;

create or replace function public.admin_list_staff()
returns table (
  user_id uuid, email text, full_name text, role text,
  permissions jsonb, created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_owner() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
    select a.user_id, u.email::text, p.full_name, a.role, a.permissions, a.created_at
    from public.admin_users a
    join auth.users u on u.id = a.user_id
    left join public.profiles p on p.id = a.user_id
    order by a.created_at;
end $$;

-- 7. Function privileges: helpers are internal; RPCs are for signed-in users only
--    (and each one rejects non-owners anyway).
revoke all on function public.admin_permission_keys() from public, anon, authenticated;
revoke all on function public.admin_sanitize_permissions(jsonb) from public, anon, authenticated;

revoke all on function public.admin_grant_staff(text, jsonb) from public, anon;
revoke all on function public.admin_set_staff_permissions(uuid, jsonb) from public, anon;
revoke all on function public.admin_revoke_staff(uuid) from public, anon;
revoke all on function public.admin_list_staff() from public, anon;
grant execute on function public.admin_grant_staff(text, jsonb) to authenticated;
grant execute on function public.admin_set_staff_permissions(uuid, jsonb) to authenticated;
grant execute on function public.admin_revoke_staff(uuid) to authenticated;
grant execute on function public.admin_list_staff() to authenticated;

commit;
