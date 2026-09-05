-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 5 of 5 · First-administrator bootstrap
--
-- A brand-new Supabase project has an empty auth.users table, so the sandbox
-- administrator (username `admin`) has to be created with a direct insert into
-- auth.users (see README → "Supabase setup → Create the first administrator").
-- The sign-up trigger from migration 0002 rejects the reserved username
-- `admin` and rolls the whole insert back, which makes that bootstrap
-- impossible. This migration loosens the guard ONLY for addresses that are
-- pre-authorised in public.admin_emails — the same allow-list that grants the
-- admin role on sign-up — so:
--
--   • ordinary registrations still cannot claim a reserved username;
--   • a sanctioned bootstrap (SQL editor) or `npm run db:seed` can create
--     the `admin` account, and the trigger builds the profile, opens the
--     starter balances and promotes it to administrator in one transaction.
--
-- Idempotent: safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username  text;
  v_role      text := 'user';
  v_bootstrap boolean;
begin
  v_username := lower(btrim(coalesce(new.raw_user_meta_data ->> 'username', '')));

  if v_username = '' then
    v_username := 'user_' || left(replace(new.id::text, '-', ''), 8);
  end if;

  if v_username !~ '^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$' or char_length(v_username) not between 3 and 20 then
    raise exception 'That username is not valid. Use 3 to 20 characters: letters, numbers, dot, dash or underscore.';
  end if;

  -- Only a pre-authorised address may take a reserved username. This is the
  -- bootstrap door for the demo administrator and for `npm run db:seed`;
  -- everyone else gets the exact same guard as before.
  v_bootstrap := lower(btrim(new.email)) in (select lower(email) from public.admin_emails);

  if not v_bootstrap and v_username in ('admin', 'root', 'support', 'system', 'null', 'undefined', 'www') then
    raise exception 'That username is reserved.';
  end if;

  if exists (select 1 from public.profiles p where lower(p.username) = v_username) then
    raise exception 'That username is already taken.';
  end if;

  if v_bootstrap then
    v_role := 'admin';
  end if;

  insert into public.profiles (id, username, email, full_name, role, last_seen_at)
  values (
    new.id,
    v_username,
    lower(btrim(new.email)),
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    v_role,
    now()
  );

  return new;
end;
$$;

-- The trigger itself is unchanged (same name, same timing); this just points
-- it at the updated function so re-running the migration is a no-op.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
