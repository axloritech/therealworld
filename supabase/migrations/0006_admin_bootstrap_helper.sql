-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 6 of 6 · goTrue-safe first-administrator bootstrap
--
-- The earlier "Create the first administrator" recipe (README / ops notes)
-- inserted directly into auth.users with a hand-picked column list. On a real
-- Supabase project that leaves every column GoTrue scans unsigned: the token
-- and verification columns (confirmation_token, recovery_token, email_change,
-- email_change_token_new, email_change_token_current, phone_change,
-- phone_change_token, reauthentication_token, …) stay NULL. GoTrue later
-- scans those columns into Go string fields, and a NULL fails with:
--
--   500: Database error querying schema
--   (sql: Scan error ... converting NULL to string is unsupported)
--
-- on password login, so the administrator can never sign in.
--
-- This migration adds public.create_bootstrap_admin(email, username, password,
-- full_name) as the ONLY supported first-admin bootstrap. It:
--
--   • pre-authorises the address in public.admin_emails so the sign-up
--     trigger grants the admin role (migration 0005 only opens reserved
--     usernames for pre-authorised addresses);
--   • writes EVERY column GoTrue scans, non-NULL;
--   • creates the matching auth.identities 'email' row so GoTrue resolves the
--     account on sign-in;
--   • is idempotent — calling it again HEALS the existing row that the old raw
--     insert left NULL (it also repairs the profile/role and identity);
--   • works on a fresh database (inserting a brand-new administrator);
--   • is revoked from PUBLIC / anon / authenticated and granted only to the
--     service role, so a browser client can never bootstrap an administrator.
--
-- Idempotent: safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.create_bootstrap_admin(
  p_email     text,
  p_username  text,
  p_password  text,
  p_full_name text default 'Platform Administrator'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email        text := lower(btrim(coalesce(p_email, '')));
  v_username     text := lower(btrim(coalesce(p_username, '')));
  v_full_name    text := nullif(btrim(coalesce(p_full_name, '')), '');
  v_instance     uuid := '00000000-0000-0000-0000-000000000000';
  v_user_id      uuid;
  v_ident_data   jsonb;
begin
  -- ── 1. Input validation ────────────────────────────────────────────────
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$' then
    raise exception 'That email address is not valid.';
  end if;
  if v_username !~ '^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$'
     or char_length(v_username) not between 3 and 20 then
    raise exception 'That username is not valid. Use 3 to 20 characters: letters, numbers, dot, dash or underscore.';
  end if;
  if char_length(coalesce(p_password, '')) < 8 then
    raise exception 'The password must be at least 8 characters long.';
  end if;

  -- ── 2. Pre-authorise the address (the sign-up trigger grants admin) ────
  insert into public.admin_emails (email)
  values (v_email)
  on conflict (email) do nothing;

  -- ── 3. Does the account already exist? ─────────────────────────────────
  select id into v_user_id
    from auth.users
   where lower(email) = v_email
   limit 1;

  if v_user_id is not null then
    -- ── HEAL the row the old raw insert left NULL. Write every column
    --    GoTrue scans so password sign-in no longer errors on a NULL token.
    update auth.users
       set confirmation_token          = coalesce(nullif(confirmation_token, ''), encode(gen_random_bytes(16), 'hex')),
           confirmation_sent_at        = coalesce(confirmation_sent_at, now()),
           recovery_token              = coalesce(nullif(recovery_token, ''), encode(gen_random_bytes(16), 'hex')),
           recovery_sent_at            = coalesce(recovery_sent_at, now()),
           email_change_token_new      = coalesce(nullif(email_change_token_new, ''), ''),
           email_change_token_current  = coalesce(nullif(email_change_token_current, ''), ''),
           email_change                = coalesce(email_change, ''),
           email_change_sent_at        = coalesce(email_change_sent_at, now()),
           email_change_confirm_status = coalesce(email_change_confirm_status, 0),
           phone                       = coalesce(phone, ''),
           phone_change                = coalesce(phone_change, ''),
           phone_change_token          = coalesce(nullif(phone_change_token, ''), ''),
           phone_change_sent_at        = coalesce(phone_change_sent_at, now()),
           reauthentication_token      = coalesce(nullif(reauthentication_token, ''), ''),
           reauthentication_sent_at    = coalesce(reauthentication_sent_at, now()),
           email_confirmed_at          = coalesce(email_confirmed_at, now()),
           invited_at                  = coalesce(invited_at, now()),
           encrypted_password          = case
                                            when p_password is not null
                                            then crypt(p_password, gen_salt('bf', 10))
                                            else encrypted_password
                                          end,
           raw_user_meta_data          = (coalesce(raw_user_meta_data, '{}'::jsonb)
                                           || jsonb_build_object(
                                                'username', v_username,
                                                'full_name', v_full_name,
                                                'role', 'admin')),
           raw_app_meta_data           = (coalesce(raw_app_meta_data, '{}'::jsonb)
                                           || jsonb_build_object('provider', 'email', 'providers', array['email'])),
           aud                         = coalesce(aud, 'authenticated'),
           role                        = coalesce(role, 'authenticated'),
           is_sso_user                 = coalesce(is_sso_user, false),
           is_anonymous                = coalesce(is_anonymous, false),
           updated_at                  = now()
     where id = v_user_id;

    -- The heal path does not re-fire the after-insert trigger, so make sure the
    -- profile row exists and carries the admin role.
    insert into public.profiles (id, username, email, full_name, role, last_seen_at)
    values (v_user_id, v_username, v_email, v_full_name, 'admin', now())
    on conflict (id) do update set
      role        = 'admin',
      username    = excluded.username,
      email       = excluded.email,
      full_name   = coalesce(excluded.full_name, public.profiles.full_name),
      last_seen_at = now();

    -- Ensure the email identity row GoTrue resolves on sign-in.
    v_ident_data := jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true);
    insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (v_email, v_user_id, v_ident_data, 'email', now(), now(), now())
    on conflict do nothing;

    return v_user_id;
  end if;

  -- ── 4. Fresh database: create a brand-new administrator ────────────────
  insert into auth.users
    (instance_id, id, aud, role, email, encrypted_password,
     email_confirmed_at, invited_at,
     confirmation_token, confirmation_sent_at,
     recovery_token, recovery_sent_at,
     email_change_token_new, email_change, email_change_sent_at,
     email_change_token_current, email_change_confirm_status,
     last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
     is_super_admin, created_at, updated_at,
     phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at,
     reauthentication_token, reauthentication_sent_at,
     is_sso_user, is_anonymous)
  values
    (v_instance, gen_random_uuid(), 'authenticated', 'authenticated', v_email,
     crypt(p_password, gen_salt('bf', 10)), now(), now(),
     encode(gen_random_bytes(16), 'hex'), now(),
     encode(gen_random_bytes(16), 'hex'), now(),
     '', '', now(),
     '', 0,
     now(), jsonb_build_object('provider', 'email', 'providers', array['email']),
     jsonb_build_object('username', v_username, 'full_name', v_full_name, 'role', 'admin'),
     false, now(), now(),
     '', now(), '', '', now(),
     '', now(),
     false, false)
  returning id into v_user_id;

  -- The on_auth_user_created (after insert) trigger builds the profile, opens
  -- the starter balances and promotes the account to admin because the address
  -- is now on the admin_emails allow-list. Add the matching email identity so
  -- GoTrue can resolve the account on sign-in.
  v_ident_data := jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true);
  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (v_email, v_user_id, v_ident_data, 'email', now(), now(), now());

  return v_user_id;
end;
$$;

-- The bootstrap helper can create or heal an administrator, so it must never
-- be reachable from the browser (anon) or by a signed-in member. Grant it only
-- to the server-side service role, which is what the SQL editor / migration
-- path uses. When p_full_name is omitted the call resolves to the same
-- (text, text, text, text) signature, so revoking/granting that one signature
-- covers both arities.
revoke execute on function public.create_bootstrap_admin(text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.create_bootstrap_admin(text, text, text, text)
  to service_role;
