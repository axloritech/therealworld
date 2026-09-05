-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 3 of 4 · Administrator functions and row-level security
--
-- RLS is the backstop: even if a caller reaches PostgREST directly with the
-- anon key, they can only ever read rows belonging to their own account.
-- Writes to balances, transactions and withdrawals are not exposed at all —
-- they exist only through the SECURITY DEFINER functions.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────── administrator-only functions ───────────────────

/**
 * Approve, reject or cancel a pending withdrawal request.
 * 'approved' marks the ledger entry completed. 'rejected' and 'cancelled'
 * refund the held amount and write a reversal entry.
 */
create or replace function public.admin_review_withdrawal(
  p_id       uuid,
  p_status   text,
  p_note     text default null,
  p_admin_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_w       public.withdrawals%rowtype;
  v_note    text := nullif(btrim(coalesce(p_note, '')), '');
  v_admin   uuid := coalesce(auth.uid(), p_admin_id);
begin
  if not public.is_privileged() then
    raise exception 'Administrator access required.';
  end if;
  if coalesce(p_status, '') not in ('approved', 'rejected', 'cancelled') then
    raise exception 'Choose approve, reject or cancel.';
  end if;
  if p_status = 'rejected' and v_note is null then
    raise exception 'Add a reason so the member can see why the request was rejected.';
  end if;

  select * into v_w from public.withdrawals where id = p_id for update;
  if not found then
    raise exception 'That request no longer exists.';
  end if;
  if v_w.status <> 'pending' then
    raise exception 'This request is already %.', v_w.status;
  end if;

  update public.withdrawals
     set status      = p_status,
         admin_note  = v_note,
         reviewed_by = v_admin,
         reviewed_at = now()
   where id = p_id;

  if p_status = 'approved' then
    update public.transactions
       set status = 'completed',
           note   = coalesce(note, '') || ' · approved by administrator'
     where reference = v_w.reference and type = 'withdrawal';
  else
    perform public.refund_withdrawal(
      v_w,
      case when p_status = 'cancelled'
        then 'Request cancelled — funds returned'
        else 'Request rejected by admin' || coalesce(' — ' || v_note, '')
      end
    );
  end if;

  return p_id;
end;
$$;

/** Set an absolute demo balance for one asset. Writes an audit-trail entry. */
create or replace function public.admin_set_balance(
  p_user_id  uuid,
  p_asset    text,
  p_amount   numeric,
  p_note     text default null,
  p_admin_id uuid default null
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cfg   public.asset_config%rowtype;
  v_old   numeric;
  v_new   numeric;
  v_delta numeric;
begin
  if not public.is_privileged() then
    raise exception 'Administrator access required.';
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_user_id) then
    raise exception 'That account does not exist.';
  end if;

  select * into v_cfg from public.asset_config where asset = upper(btrim(coalesce(p_asset, '')));
  if not found then
    raise exception 'Choose a supported asset.';
  end if;

  v_new := round(greatest(0, coalesce(p_amount, 0)), v_cfg.decimals);

  select amount into v_old from public.balances
   where user_id = p_user_id and asset = v_cfg.asset for update;
  if not found then
    insert into public.balances (user_id, asset, amount) values (p_user_id, v_cfg.asset, 0);
    v_old := 0;
  end if;

  v_delta := v_new - v_old;

  update public.balances
     set amount = v_new, updated_at = now()
   where user_id = p_user_id and asset = v_cfg.asset;

  if v_delta <> 0 then
    insert into public.transactions
      (user_id, asset, type, direction, amount, balance_after, status, reference, note)
    values
      (p_user_id, v_cfg.asset, 'admin_adjust',
       case when v_delta > 0 then 'credit' else 'debit' end,
       abs(v_delta), v_new, 'completed', public.new_reference(),
       coalesce(nullif(btrim(coalesce(p_note, '')), ''), 'Balance set by administrator'));
  end if;

  return v_new;
end;
$$;

/** Promote or demote an account. Refuses to remove the last administrator. */
create or replace function public.admin_set_role(
  p_user_id  uuid,
  p_role     text,
  p_admin_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target public.profiles%rowtype;
begin
  if not public.is_privileged() then
    raise exception 'Administrator access required.';
  end if;
  if coalesce(p_role, '') not in ('user', 'admin') then
    raise exception 'Choose a valid role.';
  end if;

  select * into v_target from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'That account does not exist.';
  end if;
  if v_target.role = p_role then
    return p_user_id;
  end if;

  if p_role = 'user' and v_target.role = 'admin'
     and (select count(*) from public.profiles where role = 'admin') <= 1 then
    raise exception 'At least one administrator must remain.';
  end if;

  update public.profiles set role = p_role where id = p_user_id;

  -- Keep the JWT metadata in step so routing decisions agree with the database.
  update auth.users
     set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', p_role)
   where id = p_user_id;

  return p_user_id;
end;
$$;

/** Suspend or reactivate an account. */
create or replace function public.admin_set_active(p_user_id uuid, p_is_active boolean)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_privileged() then
    raise exception 'Administrator access required.';
  end if;
  update public.profiles set is_active = coalesce(p_is_active, true) where id = p_user_id;
  return p_user_id;
end;
$$;

/** Platform totals for the admin overview. */
create or replace function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.is_privileged() then
    raise exception 'Administrator access required.';
  end if;

  select jsonb_build_object(
    'users',               (select count(*) from public.profiles where role <> 'admin'),
    'pending_withdrawals', (select count(*) from public.withdrawals where status = 'pending'),
    'approved_withdrawals',(select count(*) from public.withdrawals where status = 'approved'),
    'rejected_withdrawals',(select count(*) from public.withdrawals where status = 'rejected'),
    'open_threads',        (select count(*) from public.support_threads where status <> 'closed'),
    'transactions',        (select count(*) from public.transactions),
    'treasury_sent_usd',   (select coalesce(sum(t.amount * c.price_usd), 0)
                              from public.transactions t
                              join public.asset_config c on c.asset = t.asset
                             where t.type = 'treasury'),
    'withdrawal_volume',   (select coalesce(sum(w.payout * c.price_usd), 0)
                              from public.withdrawals w
                              join public.asset_config c on c.asset = w.asset
                             where w.status = 'approved'),
    'balances',            (select coalesce(jsonb_object_agg(b.asset, b.total), '{}'::jsonb)
                              from (select asset, sum(amount) as total
                                      from public.balances group by asset) b)
  ) into v_result;

  return v_result;
end;
$$;

-- ─────────────────────────── enable RLS ───────────────────────────

alter table public.profiles         enable row level security;
alter table public.balances         enable row level security;
alter table public.transactions     enable row level security;
alter table public.withdrawals      enable row level security;
alter table public.support_threads  enable row level security;
alter table public.support_messages enable row level security;
alter table public.faqs             enable row level security;
alter table public.asset_config     enable row level security;
alter table public.admin_emails     enable row level security;

-- ─────────────────────────── policies ───────────────────────────

drop policy if exists "profiles: read own or admin"      on public.profiles;
drop policy if exists "profiles: update own or admin"    on public.profiles;
create policy "profiles: read own or admin" on public.profiles
  for select using (auth.uid() = id or public.is_admin());
create policy "profiles: update own or admin" on public.profiles
  for update using (auth.uid() = id or public.is_admin())
               with check (auth.uid() = id or public.is_admin());
-- No insert/delete policies: profiles are created by the auth trigger and
-- removed by cascade, both of which run as the table owner.

drop policy if exists "balances: read own or admin" on public.balances;
create policy "balances: read own or admin" on public.balances
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "transactions: read own or admin" on public.transactions;
create policy "transactions: read own or admin" on public.transactions
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "withdrawals: read own or admin" on public.withdrawals;
create policy "withdrawals: read own or admin" on public.withdrawals
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "threads: read own or admin" on public.support_threads;
create policy "threads: read own or admin" on public.support_threads
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "messages: read participant or admin" on public.support_messages;
create policy "messages: read participant or admin" on public.support_messages
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.support_threads t
      where t.id = thread_id and t.user_id = auth.uid()
    )
  );

-- Public reference data.
drop policy if exists "faqs: public read" on public.faqs;
create policy "faqs: public read" on public.faqs for select using (true);

drop policy if exists "asset_config: public read" on public.asset_config;
create policy "asset_config: public read" on public.asset_config for select using (true);

drop policy if exists "admin_emails: admin read" on public.admin_emails;
create policy "admin_emails: admin read" on public.admin_emails
  for select using (public.is_admin());

-- ─────────────────── tighten function permissions ───────────────────
--
-- PostgreSQL grants EXECUTE to the PUBLIC pseudo-role by default, so revoking
-- from `anon` alone would leave every function callable anonymously. Each
-- signature is therefore revoked from PUBLIC *and* anon, then granted only to
-- the signed-in and server roles.
--
-- Authorisation is still checked inside every function — this is defence in
-- depth, not the only gate.
--
-- Deliberately left open to PUBLIC (anon included):
--   • check_username_available(text) — the registration form needs it signed out
--   • is_admin() / is_privileged() / acting_uid() — evaluated inside RLS policies
--   • is_valid_address(text,text,text) — pure format check over public config

do $$
declare
  v_signature text;
  v_signatures text[] := array[
    'public.admin_review_withdrawal(uuid, text, text, uuid)',
    'public.admin_set_balance(uuid, text, numeric, text, uuid)',
    'public.admin_set_role(uuid, text, uuid)',
    'public.admin_set_active(uuid, boolean)',
    'public.admin_stats()',
    'public.credit_funds(uuid, text, numeric, text, text)',
    'public.request_withdrawal(text, numeric, text, text)',
    'public.cancel_withdrawal(uuid, uuid)',
    'public.create_support_thread(text, text, uuid)',
    'public.send_support_message(uuid, text, uuid)',
    'public.set_thread_status(uuid, text)'
  ];
begin
  foreach v_signature in array v_signatures loop
    execute format('revoke execute on function %s from public, anon', v_signature);
    execute format('grant execute on function %s to authenticated, service_role', v_signature);
  end loop;
end;
$$;

-- Internal helper: never callable over the API by anyone but the owner.
revoke execute on function public.refund_withdrawal(public.withdrawals, text)
  from public, anon, authenticated, service_role;
