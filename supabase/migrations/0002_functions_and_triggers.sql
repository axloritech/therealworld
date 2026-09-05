-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 2 of 4 · Functions, triggers and the money-movement RPCs
--
-- Every balance change happens inside a SECURITY DEFINER function so that the
-- check-and-debit sequence is atomic. Callers cannot debit a balance they do
-- not own, and a request can never half-succeed.
--
-- Because these functions are owned by `postgres` (the table owner), they are
-- not subject to RLS; authorisation is therefore enforced explicitly at the top
-- of each function. The browser only ever holds the anon key, and every
-- user-facing path is additionally gated by the policies in migration 3.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────── authorisation helpers ───────────────────────

/** True when the current JWT belongs to an active administrator profile. */
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin' and p.is_active
  );
$$;

/**
 * True for administrators, or for the server-side service role.
 * The service-role key never reaches the browser; the application also checks
 * `requireAdmin()` before calling any privileged function.
 */
create or replace function public.is_privileged()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.role() = 'service_role' or public.is_admin();
$$;

/** The acting user id, allowing the service role to act on a named account. */
create or replace function public.acting_uid(p_override uuid default null)
returns uuid
language sql
stable
as $$
  select coalesce(auth.uid(), p_override);
$$;

-- ─────────────────────────── utilities ───────────────────────────

/** Human-readable ledger reference, e.g. TRW-260905-4F3A9C. */
create or replace function public.new_reference()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  v_ref text;
begin
  loop
    v_ref := 'TRW-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.withdrawals w where w.reference = v_ref);
  end loop;
  return v_ref;
end;
$$;

/** Opening sandbox funds handed to every new account. */
create or replace function public.starter_balance(p_asset text)
returns numeric
language sql
immutable
set search_path = public
as $$
  select case p_asset
    when 'BTC'  then 0.025
    when 'ETH'  then 0.45
    when 'USDT' then 1250
    else 0
  end;
$$;

/**
 * Wallet address format validation, mirroring src/lib/validate.ts.
 * Format only — addresses are never broadcast anywhere.
 */
create or replace function public.is_valid_address(p_asset text, p_network text, p_address text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_address is null or char_length(p_address) not between 10 and 128 then false
    when p_address ~ '[[:space:]]' then false
    when p_network = 'bitcoin'
      then p_address ~ '^(?:[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{25,62})$'
    when p_network in ('erc20', 'arbitrum', 'bep20')
      then p_address ~ '^0x[a-fA-F0-9]{40}$'
    when p_network = 'trc20'
      then p_address ~ '^T[1-9A-HJ-NP-Za-km-z]{33}$'
    else false
  end
  and p_network = any (
    coalesce(
      (select networks from public.asset_config where asset = p_asset),
      array[]::text[]
    )
  );
$$;

-- ───────────────────── sign-up: create the profile ─────────────────────
-- Runs inside the auth.users insert transaction, so raising here rolls the
-- sign-up back — a duplicate username can never create an orphan auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_role     text := 'user';
begin
  v_username := lower(btrim(coalesce(new.raw_user_meta_data ->> 'username', '')));

  if v_username = '' then
    v_username := 'user_' || left(replace(new.id::text, '-', ''), 8);
  end if;

  if v_username !~ '^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$' or char_length(v_username) not between 3 and 20 then
    raise exception 'That username is not valid. Use 3 to 20 characters: letters, numbers, dot, dash or underscore.';
  end if;

  if v_username in ('admin', 'root', 'support', 'system', 'null', 'undefined', 'www') then
    raise exception 'That username is reserved.';
  end if;

  if exists (select 1 from public.profiles p where lower(p.username) = v_username) then
    raise exception 'That username is already taken.';
  end if;

  if lower(btrim(new.email)) in (select lower(email) from public.admin_emails) then
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────── new profile: open balances + starter funds ─────────────
create or replace function public.handle_new_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_asset  text;
  v_amount numeric;
begin
  foreach v_asset in array array['BTC', 'ETH', 'USDT'] loop
    v_amount := public.starter_balance(v_asset);

    insert into public.balances (user_id, asset, amount)
    values (new.id, v_asset, v_amount)
    on conflict (user_id, asset) do nothing;

    if v_amount > 0 then
      insert into public.transactions
        (user_id, asset, type, direction, amount, balance_after, status, reference, note)
      values
        (new.id, v_asset, 'bonus', 'credit', v_amount, v_amount, 'completed',
         public.new_reference(), 'Sandbox starter funds');
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists on_profile_created on public.profiles;
create trigger on_profile_created
  after insert on public.profiles
  for each row execute function public.handle_new_profile();

-- ─────── protect identity fields from self-service escalation ───────
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_privileged() then
    return new;
  end if;

  if new.id is distinct from old.id then
    raise exception 'Account id cannot be changed.';
  end if;
  if lower(new.username) is distinct from lower(old.username) then
    raise exception 'Usernames are permanent. Contact an administrator.';
  end if;
  if lower(new.email) is distinct from lower(old.email) then
    raise exception 'Email changes are handled by account recovery, not here.';
  end if;
  if new.role is distinct from old.role then
    raise exception 'Roles are granted by an administrator.';
  end if;
  if new.is_active is distinct from old.is_active then
    raise exception 'Account status is managed by an administrator.';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_fields on public.profiles;
create trigger protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- ─────────────────── support thread bookkeeping ───────────────────
create or replace function public.handle_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.support_threads t
     set message_count   = t.message_count + 1,
         last_message_at = new.created_at,
         status = case
           when t.status = 'closed'      then t.status          -- never silently reopen
           when new.sender_role = 'admin' then 'answered'
           else 'open'
         end
   where t.id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists on_support_message on public.support_messages;
create trigger on_support_message
  after insert on public.support_messages
  for each row execute function public.handle_new_message();

-- ═══════════════════════════ public RPCs ═══════════════════════════

/** Availability check used by the registration form as the user types. */
create or replace function public.check_username_available(p_username text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_username text := lower(btrim(coalesce(p_username, '')));
begin
  if v_username !~ '^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$'
     or char_length(v_username) not between 3 and 20 then
    return false;
  end if;
  if v_username in ('admin', 'root', 'support', 'system', 'null', 'undefined', 'www') then
    return false;
  end if;
  return not exists (select 1 from public.profiles p where lower(p.username) = v_username);
end;
$$;

-- ═══════════════════════════ funds ═══════════════════════════

/**
 * Credit sandbox funds to an account (member self-service deposit, or an
 * administrator credit). Returns the ledger reference.
 */
create or replace function public.credit_funds(
  p_user_id uuid,
  p_asset   text,
  p_amount  numeric,
  p_type    text default 'deposit',
  p_note    text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cfg   public.asset_config%rowtype;
  v_bal   numeric;
  v_new   numeric;
  v_ref   text;
  v_actor uuid := public.acting_uid();
begin
  -- The service-role client carries no JWT subject; privileged callers pass
  -- p_user_id explicitly (seed scripts, server-side credits).
  if v_actor is null and not public.is_privileged() then
    raise exception 'You need to be signed in.';
  end if;
  if not (public.is_privileged() or v_actor = p_user_id) then
    raise exception 'You can only credit your own account.';
  end if;
  if coalesce(p_type, 'deposit') not in ('deposit', 'bonus', 'treasury') then
    raise exception 'Invalid transaction type.';
  end if;
  -- Treasury sends come out of the administrator's mock balance: members can
  -- never credit themselves with them.
  if p_type = 'treasury' and not public.is_privileged() then
    raise exception 'Only administrators can send treasury funds.';
  end if;

  select * into v_cfg from public.asset_config where asset = upper(btrim(coalesce(p_asset, '')));
  if not found then
    raise exception 'Choose a supported asset.';
  end if;

  v_new := round(coalesce(p_amount, 0), v_cfg.decimals);
  if v_new <= 0 then
    raise exception 'Enter an amount greater than zero.';
  end if;
  if v_new < v_cfg.min_deposit then
    raise exception 'Minimum deposit is % %.', trim_scale(v_cfg.min_deposit), v_cfg.asset;
  end if;
  if v_new > v_cfg.max_deposit then
    raise exception 'Maximum deposit is % %.', trim_scale(v_cfg.max_deposit), v_cfg.asset;
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_user_id and p.is_active) then
    raise exception 'That account is suspended or does not exist.';
  end if;

  select amount into v_bal from public.balances
   where user_id = p_user_id and asset = v_cfg.asset for update;
  if not found then
    insert into public.balances (user_id, asset, amount) values (p_user_id, v_cfg.asset, 0);
    v_bal := 0;
  end if;

  update public.balances
     set amount = v_bal + v_new, updated_at = now()
   where user_id = p_user_id and asset = v_cfg.asset;

  v_ref := public.new_reference();
  insert into public.transactions
    (user_id, asset, type, direction, amount, balance_after, status, reference, note)
  values
    (p_user_id, v_cfg.asset, p_type, 'credit', v_new, v_bal + v_new, 'completed', v_ref,
     nullif(btrim(coalesce(p_note, '')), ''));

  return v_ref;
end;
$$;

/**
 * Create a withdrawal request. Validates the network and address format,
 * enforces per-asset limits, debits the held amount and writes the ledger
 * entry — all in one transaction. The request is created as 'pending'.
 */
create or replace function public.request_withdrawal(
  p_asset   text,
  p_amount  numeric,
  p_network text,
  p_address text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := public.acting_uid();
  v_cfg    public.asset_config%rowtype;
  v_bal    numeric;
  v_amount numeric;
  v_addr   text := btrim(coalesce(p_address, ''));
  v_net    text := lower(btrim(coalesce(p_network, '')));
  v_ref    text;
  v_id     uuid;
begin
  if v_uid is null then
    raise exception 'You need to be signed in.';
  end if;
  if not exists (select 1 from public.profiles p where p.id = v_uid and p.is_active) then
    raise exception 'This account is suspended.';
  end if;

  select * into v_cfg from public.asset_config where asset = upper(btrim(coalesce(p_asset, '')));
  if not found then
    raise exception 'Choose a supported asset.';
  end if;
  if not (v_net = any (v_cfg.networks)) then
    raise exception 'Choose a supported network for this asset.';
  end if;
  if not public.is_valid_address(v_cfg.asset, v_net, v_addr) then
    raise exception 'That does not look like a valid % address.', upper(v_net);
  end if;

  v_amount := round(coalesce(p_amount, 0), v_cfg.decimals);
  if v_amount <= 0 then
    raise exception 'Enter an amount greater than zero.';
  end if;
  if v_amount < v_cfg.min_withdraw then
    raise exception 'Minimum withdrawal is % %.', trim_scale(v_cfg.min_withdraw), v_cfg.asset;
  end if;
  if v_amount > v_cfg.max_withdraw then
    raise exception 'Maximum withdrawal per request is % %.', trim_scale(v_cfg.max_withdraw), v_cfg.asset;
  end if;
  if v_amount - v_cfg.fee <= 0 then
    raise exception 'Amount must exceed the % % network fee.', trim_scale(v_cfg.fee), v_cfg.asset;
  end if;

  select amount into v_bal from public.balances
   where user_id = v_uid and asset = v_cfg.asset for update;
  if not found then
    insert into public.balances (user_id, asset, amount) values (v_uid, v_cfg.asset, 0);
    v_bal := 0;
  end if;
  if v_bal < v_amount then
    raise exception 'Insufficient % balance. Available: %.', v_cfg.asset, trim_scale(v_bal);
  end if;

  update public.balances
     set amount = v_bal - v_amount, updated_at = now()
   where user_id = v_uid and asset = v_cfg.asset;

  v_ref := public.new_reference();

  insert into public.withdrawals
    (user_id, asset, amount, fee, payout, network, wallet_address, status, reference)
  values
    (v_uid, v_cfg.asset, v_amount, v_cfg.fee, v_amount - v_cfg.fee, v_net, v_addr, 'pending', v_ref)
  returning id into v_id;

  insert into public.transactions
    (user_id, asset, type, direction, amount, balance_after, status, reference, wallet_address, note)
  values
    (v_uid, v_cfg.asset, 'withdrawal', 'debit', v_amount, v_bal - v_amount, 'pending', v_ref, v_addr,
     'Withdrawal request · ' || upper(v_net) || ' · awaiting review');

  return v_id;
end;
$$;

/** Shared refund path used by both cancellation and rejection. */
create or replace function public.refund_withdrawal(p_withdrawal public.withdrawals, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bal numeric;
begin
  select amount into v_bal from public.balances
   where user_id = p_withdrawal.user_id and asset = p_withdrawal.asset for update;
  if not found then
    insert into public.balances (user_id, asset, amount)
    values (p_withdrawal.user_id, p_withdrawal.asset, 0);
    v_bal := 0;
  end if;

  update public.balances
     set amount = v_bal + p_withdrawal.amount, updated_at = now()
   where user_id = p_withdrawal.user_id and asset = p_withdrawal.asset;

  update public.transactions
     set status = 'reversed',
         note   = 'Reversed — ' || p_reason
   where reference = p_withdrawal.reference and type = 'withdrawal';

  insert into public.transactions
    (user_id, asset, type, direction, amount, balance_after, status, reference, wallet_address, note)
  values
    (p_withdrawal.user_id, p_withdrawal.asset, 'withdrawal_reversal', 'credit',
     p_withdrawal.amount, v_bal + p_withdrawal.amount, 'completed',
     p_withdrawal.reference, p_withdrawal.wallet_address, p_reason);
end;
$$;

/** A member cancels their own pending request; the hold is released at once. */
create or replace function public.cancel_withdrawal(p_id uuid, p_user_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_w   public.withdrawals%rowtype;
  v_uid uuid := public.acting_uid(p_user_id);
begin
  if v_uid is null then
    raise exception 'You need to be signed in.';
  end if;

  select * into v_w from public.withdrawals where id = p_id for update;
  if not found then
    raise exception 'That request no longer exists.';
  end if;
  if v_w.user_id <> v_uid and not public.is_privileged() then
    raise exception 'You can only cancel your own requests.';
  end if;
  if v_w.status <> 'pending' then
    raise exception 'Only pending requests can be cancelled. This one is %.', v_w.status;
  end if;

  update public.withdrawals
     set status      = 'cancelled',
         admin_note  = 'Cancelled by user',
         reviewed_by = auth.uid(),
         reviewed_at = now()
   where id = p_id;

  perform public.refund_withdrawal(v_w, 'Request cancelled by user — funds returned');
  return p_id;
end;
$$;

-- ═══════════════════════════ support ═══════════════════════════

create or replace function public.create_support_thread(
  p_subject text,
  p_body    text,
  p_user_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := public.acting_uid(p_user_id);
  v_profile public.profiles%rowtype;
  v_thread  uuid;
begin
  if v_uid is null then
    raise exception 'You need to be signed in.';
  end if;
  select * into v_profile from public.profiles where id = v_uid and is_active;
  if not found then
    raise exception 'This account is suspended.';
  end if;
  if char_length(btrim(coalesce(p_subject, ''))) not between 3 and 120 then
    raise exception 'Add a subject between 3 and 120 characters.';
  end if;
  if char_length(btrim(coalesce(p_body, ''))) not between 1 and 4000 then
    raise exception 'Write a message of up to 4000 characters.';
  end if;

  insert into public.support_threads (user_id, subject, status)
  values (v_uid, btrim(p_subject), 'open')
  returning id into v_thread;

  insert into public.support_messages (thread_id, sender_role, sender_name, body)
  values (v_thread, v_profile.role, coalesce(v_profile.full_name, v_profile.username), btrim(p_body));

  return v_thread;
end;
$$;

create or replace function public.send_support_message(
  p_thread_id uuid,
  p_body      text,
  p_user_id   uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_thread  public.support_threads%rowtype;
  v_uid     uuid := public.acting_uid(p_user_id);
  v_profile public.profiles%rowtype;
  v_id      uuid;
begin
  if v_uid is null then
    raise exception 'You need to be signed in.';
  end if;

  select * into v_thread from public.support_threads where id = p_thread_id for update;
  if not found then
    raise exception 'That conversation no longer exists.';
  end if;
  if not (public.is_privileged() or v_thread.user_id = v_uid) then
    raise exception 'You cannot post in this conversation.';
  end if;
  if v_thread.status = 'closed' then
    raise exception 'This conversation is closed. Start a new one to continue.';
  end if;
  if char_length(btrim(coalesce(p_body, ''))) not between 1 and 4000 then
    raise exception 'Write a message of up to 4000 characters.';
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if not found then
    raise exception 'Account not found.';
  end if;

  insert into public.support_messages (thread_id, sender_role, sender_name, body)
  values (p_thread_id, v_profile.role, coalesce(v_profile.full_name, v_profile.username), btrim(p_body))
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.set_thread_status(p_thread_id uuid, p_status text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_thread public.support_threads%rowtype;
  v_uid    uuid := public.acting_uid();
begin
  if coalesce(p_status, '') not in ('open', 'answered', 'closed') then
    raise exception 'Choose a valid status.';
  end if;

  select * into v_thread from public.support_threads where id = p_thread_id for update;
  if not found then
    raise exception 'That conversation no longer exists.';
  end if;
  if not (public.is_privileged() or v_thread.user_id = v_uid) then
    raise exception 'You cannot manage this conversation.';
  end if;

  update public.support_threads set status = p_status where id = p_thread_id;
  return p_thread_id;
end;
$$;
