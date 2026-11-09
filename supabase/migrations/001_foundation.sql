-- 001_foundation: helpers + admin identity. No app data here.
create extension if not exists pg_trgm with schema extensions;

-- Generic trigger: keeps updated_at current.
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Admins live ONLY here. Clients can never write to this table:
-- rows are added manually by the owner from the SQL Editor.
create table public.admin_users (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  role        text not null default 'staff' check (role in ('owner','manager','staff')),
  permissions jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_admin_users_updated before update on public.admin_users
  for each row execute function public.set_updated_at();

alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon, authenticated;
grant select on public.admin_users to authenticated;
create policy admin_users_select_own on public.admin_users
  for select to authenticated using (user_id = (select auth.uid()));

-- SECURITY DEFINER on purpose: policies on other tables must read admin_users
-- without exposing it. search_path is empty; only boolean results are returned.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admin_users where user_id = (select auth.uid()));
$$;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admin_users
                 where user_id = (select auth.uid()) and role = 'owner');
$$;

-- Owner has every permission; others need permissions->>key = 'true'.
create or replace function public.has_permission(p text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_owner() or coalesce(
    (select (permissions ->> p)::boolean from public.admin_users
      where user_id = (select auth.uid())), false);
$$;

revoke all on function public.is_admin(), public.is_owner(), public.has_permission(text) from public;
grant execute on function public.is_admin(), public.is_owner(), public.has_permission(text) to anon, authenticated;
