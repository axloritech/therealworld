-- ═══════════════════════════════════════════════════════════════════════════
-- THE REAL WORLD — demo trading platform
-- Migration 1 of 4 · Core schema
--
-- Run the four migration files in numeric order (Supabase SQL editor or
-- `supabase db push`). Safe to re-run: every statement is idempotent.
--
-- SANDBOX NOTICE: this schema stores simulated balances only. Nothing in it
-- connects to an exchange, a bank or a blockchain.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ─────────────────────────── profiles ───────────────────────────
-- One row per auth.users row, created automatically by a trigger.
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  username      text not null,
  email         text not null,
  full_name     text,
  phone         text,
  country       text,
  avatar_url    text,
  role          text not null default 'user' check (role in ('user', 'admin')),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz,
  constraint profiles_username_format
    check (username ~ '^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$' and char_length(username) between 3 and 20),
  constraint profiles_email_format
    check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$')
);

-- Usernames and emails are globally unique, case-insensitively.
create unique index if not exists profiles_username_key on public.profiles (lower(username));
create unique index if not exists profiles_email_key    on public.profiles (lower(email));
create index if not exists profiles_role_idx            on public.profiles (role);
create index if not exists profiles_created_idx         on public.profiles (created_at desc);

-- Addresses auto-promoted to administrator on sign-up.
--   insert into public.admin_emails values ('you@yourdomain.com');
create table if not exists public.admin_emails (
  email      text primary key check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$'),
  created_at timestamptz not null default now()
);

-- ──────────────────────── asset_config ────────────────────────
-- Single source of truth for limits and fees. The Postgres functions validate
-- against this table, so changing a rule here changes it everywhere.
create table if not exists public.asset_config (
  asset        text primary key check (asset in ('BTC', 'ETH', 'USDT')),
  name         text not null,
  decimals     integer not null check (decimals between 0 and 8),
  price_usd    numeric(24, 8) not null check (price_usd >= 0),
  min_withdraw numeric(24, 8) not null check (min_withdraw > 0),
  max_withdraw numeric(24, 8) not null check (max_withdraw > 0),
  fee          numeric(24, 8) not null check (fee >= 0),
  min_deposit  numeric(24, 8) not null check (min_deposit > 0),
  max_deposit  numeric(24, 8) not null check (max_deposit > 0),
  networks     text[] not null,
  -- The smallest permitted withdrawal must exceed the fee, otherwise a payout
  -- could round to zero.
  constraint asset_config_fee_below_minimum check (min_withdraw > fee)
);

insert into public.asset_config
  (asset, name, decimals, price_usd, min_withdraw, max_withdraw, fee, min_deposit, max_deposit, networks)
values
  ('BTC',  'Bitcoin',    8, 68250.00, 0.0005,      5,      0.0002, 0.0001,     10,       array['bitcoin']),
  ('ETH',  'Ethereum',   6,  3540.00, 0.01,      200,      0.004,  0.001,     500,      array['erc20', 'arbitrum']),
  ('USDT', 'Tether USD', 2,     1.00, 20,     100000,      1,      1,     1000000,      array['trc20', 'erc20', 'bep20'])
on conflict (asset) do update set
  name         = excluded.name,
  decimals     = excluded.decimals,
  price_usd    = excluded.price_usd,
  min_withdraw = excluded.min_withdraw,
  max_withdraw = excluded.max_withdraw,
  fee          = excluded.fee,
  min_deposit  = excluded.min_deposit,
  max_deposit  = excluded.max_deposit,
  networks     = excluded.networks;

-- ─────────────────────────── balances ───────────────────────────
-- One row per (user, asset). Amounts may never go negative.
create table if not exists public.balances (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  asset      text not null check (asset in ('BTC', 'ETH', 'USDT')),
  amount     numeric(24, 8) not null default 0 check (amount >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, asset)
);
create index if not exists balances_asset_idx on public.balances (asset);

-- ───────────────────────── transactions ─────────────────────────
-- Append-only audit trail. Rows are written by the RPCs below, never updated
-- in place except to mark a withdrawal entry reversed/completed.
create table if not exists public.transactions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  asset          text not null check (asset in ('BTC', 'ETH', 'USDT')),
  type           text not null check (type in
                   ('deposit', 'bonus', 'treasury', 'withdrawal', 'withdrawal_reversal', 'admin_adjust', 'trade')),
  direction      text not null check (direction in ('credit', 'debit')),
  amount         numeric(24, 8) not null check (amount > 0),
  balance_after  numeric(24, 8),
  status         text not null default 'completed' check (status in ('completed', 'pending', 'reversed')),
  reference      text,
  wallet_address text,
  note           text,
  created_at     timestamptz not null default now()
);
create index if not exists transactions_user_created_idx on public.transactions (user_id, created_at desc);
create index if not exists transactions_reference_idx    on public.transactions (reference);
create index if not exists transactions_asset_idx        on public.transactions (asset);

-- ────────────────────────── withdrawals ──────────────────────────
-- Created as 'pending'. The held amount is debited immediately and refunded
-- automatically if the request is rejected or cancelled.
create table if not exists public.withdrawals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  asset          text not null check (asset in ('BTC', 'ETH', 'USDT')),
  amount         numeric(24, 8) not null check (amount > 0),
  fee            numeric(24, 8) not null default 0 check (fee >= 0),
  payout         numeric(24, 8) not null default 0 check (payout >= 0),
  network        text not null,
  wallet_address text not null,
  status         text not null default 'pending'
                 check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  admin_note     text,
  reviewed_by    uuid references public.profiles (id) on delete set null,
  reviewed_at    timestamptz,
  reference      text not null unique,
  created_at     timestamptz not null default now(),
  constraint withdrawals_payout_matches check (payout = amount - fee)
);
create index if not exists withdrawals_status_created_idx on public.withdrawals (status, created_at desc);
create index if not exists withdrawals_user_idx           on public.withdrawals (user_id, created_at desc);

-- ─────────────────────────── support ───────────────────────────
create table if not exists public.support_threads (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  subject         text not null check (char_length(subject) between 3 and 120),
  status          text not null default 'open' check (status in ('open', 'answered', 'closed')),
  message_count   integer not null default 0 check (message_count >= 0),
  created_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
create index if not exists support_threads_user_idx   on public.support_threads (user_id, last_message_at desc);
create index if not exists support_threads_status_idx on public.support_threads (status, last_message_at desc);

create table if not exists public.support_messages (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references public.support_threads (id) on delete cascade,
  sender_role text not null check (sender_role in ('user', 'admin')),
  sender_name text not null,
  body        text not null check (char_length(body) between 1 and 4000),
  created_at  timestamptz not null default now()
);
create index if not exists support_messages_thread_idx on public.support_messages (thread_id, created_at);

-- ───────────────────────────── faqs ─────────────────────────────
-- Public knowledge base. Seeded by migration 0004.
create table if not exists public.faqs (
  id       text primary key,
  category text not null default 'General',
  question text not null check (char_length(question) between 5 and 300),
  answer   text not null check (char_length(answer) between 10 and 4000),
  position integer not null default 0
);
create index if not exists faqs_position_idx on public.faqs (position);
