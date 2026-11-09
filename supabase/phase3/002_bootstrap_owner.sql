-- QUEEN STORE — set the PRIMARY OWNER. Run MANUALLY, once, in the SQL Editor only.
-- Nobody becomes owner by signing up: this is the only way to create one.
--
-- Step 1: check whether an owner already exists (it may, from Phase 2 testing).
select a.user_id, u.email, a.role
from public.admin_users a
join auth.users u on u.id = a.user_id;

-- Step 2: only if you need to add/replace the owner. The account must already exist
-- and have a confirmed email. Replace the email, then run this statement.
insert into public.admin_users (user_id, role, permissions)
select u.id, 'owner', '{}'::jsonb
from auth.users u
where lower(u.email) = lower('PUT_OWNER_EMAIL_HERE')
  and u.email_confirmed_at is not null
    and not exists (select 1 from public.admin_users a where a.user_id = u.id);

    -- If that account is already a 'staff' row and must become owner:
    -- update public.admin_users set role = 'owner'
    -- where user_id = (select id from auth.users where lower(email) = lower('PUT_OWNER_EMAIL_HERE'));
    