# The Real World — trading platform demo

A responsive **Next.js 15 + Supabase** financial trading platform **demonstration**.
Dark/black UI with sandy-orange accents, replicated section-for-section from the
owner's live marketing site, plus a member dashboard, an administrator console
and a human customer-support desk.

> **Sandbox only.** Every balance, deposit, withdrawal and "trade" is simulated.
> No real fiat currency and no real cryptocurrency is ever transferred, held or
> exchanged. There is no custody, no exchange connectivity and no blockchain
> signing anywhere in this codebase. There is **no AI** in any feature: FAQ
> answers are instant static lookups and support conversations are human-only.

---

## Two database modes, one codebase

| Mode | When it activates | What you get |
| --- | --- | --- |
| **Local demo** (default) | No Supabase env vars set | File-backed sandbox database in `.data/`, seeded with demo members, threads and withdrawal requests. Works instantly on a fresh clone and on read-only hosts (falls back to the OS temp dir). |
| **Supabase** | `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` set | The exact same UI on a real Postgres database with row-level security, database-enforced unique usernames and `SECURITY DEFINER` money-movement functions. Add `SUPABASE_SERVICE_ROLE_KEY` for privileged server-side operations. |

Switching modes changes nothing in the UI: both implement the same `Repo`
interface (`src/lib/repo.ts`).

## Quick start

```bash
npm install
npm run dev            # http://localhost:3000 — demo mode, zero configuration
```

Demo credentials (local demo mode only, shown on the login page):

| Role | Username | Password |
| --- | --- | --- |
| Administrator | `admin` | `Admin1234!` |
| Members | `adaeze`, `chidi`, `zainab`, `tunde`, `grace`, `kemi` | `Demo1234!` |

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Standard Next.js lifecycle (bound to `0.0.0.0:3000`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:seed` | Seed a **Supabase** project with the demo dataset (`scripts/seed-demo.mjs`, supports `--dry-run`, `--force`, `--no-withdrawals`, `--no-threads`) |
| `npm run db:admin` | Promote/demote administrators or pre-authorise emails (`scripts/make-admin.mjs -- <username-or-email>`, `--list`, `--allow-email …`) |
| `npm run db:test` | Apply `supabase/migrations` to a throwaway embedded Postgres and run the SQL assertion suite (`scripts/test-supabase-sql.mjs`; needs `npm i -D embedded-postgres @embedded-postgres/linux-x64 pg`) |

## Feature map

- **Auth** — registration with database-enforced **unique usernames** (the
  sign-up trigger rolls the whole insert back on collision, so no orphan auth
  rows), login by username *or* email, role-based admin access.
- **Member dashboard** — BTC / ETH / USDT balances, deposits, withdrawal
  requests (amount + network + wallet address with per-network format
  validation), full ledger with reversals, settings.
- **Withdrawals** — created as **Pending** with the amount held; only an
  administrator can approve or reject (rejection refunds automatically and
  writes a reversal entry); members may cancel their own pending requests.
- **Admin console** (`/admin`) — search members by username, inspect balances
  and history, manage demo balances, review the withdrawal queue, answer
  support threads, platform stats — plus the **mock $1,000,000,000,000.00
  treasury**: a cosmetic administrator balance that can be *sent to any member
  by username* ("Send from the mock treasury"), decreasing by the USD value of
  every send and recorded in the recipient's ledger as a `treasury` transfer.
- **Support** — member ↔ admin threads with instant status transitions;
  floating launcher on marketing pages; FAQ with instant client-side answers.
- **History** — every credit, debit, hold, refund, reversal and admin
  adjustment is a ledger row with reference, note and balance-after.

## Supabase setup

1. Create a project, then apply `supabase/migrations/0001…0006`
   (`supabase db push`, or paste them in the SQL editor in order).
   They are idempotent and seed the asset config and the FAQ knowledge base.
2. Copy `.env.example` → `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only; **never** prefix with
     `NEXT_PUBLIC_`, never commit, never ship to the browser)
   - optional `ADMIN_EMAILS` (comma-separated addresses auto-promoted on sign-up)
3. Optional: `npm run db:seed` for demo data, `npm run db:admin -- you@x.com`
   to grant yourself admin.

### Create the first administrator

A fresh Supabase project has **zero users** in `auth.users`, so the demo
administrator (`admin` / `Admin1234!`) does not exist there — the demo
credentials above are local-demo-mode only. Paste this into **Database → SQL
editor** after the migrations have been applied:

```sql
select public.create_bootstrap_admin(
  'admin@therealworld.demo', 'admin', 'Admin1234!', 'Platform Administrator'
);
```

`public.create_bootstrap_admin(email, username, password, full_name)` — added in
migration `0006` — is the **only** supported first-administrator bootstrap. In
one call it:

- pre-authorises the address in `public.admin_emails`, so the sign-up trigger
  grants the **admin** role (migration `0005` opens reserved usernames only to
  pre-authorised addresses);
- writes **every** column GoTrue scans (`confirmation_token`, `recovery_token`,
  `email_change`, `email_change_token_new`, `email_change_token_current`,
  `reauthentication_token`, …) so password sign-in works;
- creates the matching `auth.identities` email row, so GoTrue resolves the
  account on sign-in;
- opens the starter balances and ledger entries via the profile trigger;
- is **idempotent** — calling it again is safe, and if the account was created
  earlier by the old raw `insert into auth.users …` recipe it **heals** the row,
  filling the NULL token columns that caused:

  `500: Database error querying schema`
  `(sql: Scan error ... converting NULL to string is unsupported)`

The helper is revoked from `anon` / `authenticated` and granted only to the
`service_role`, so a browser client can never bootstrap an administrator.

> The old raw `insert into auth.users (id, instance_id, aud, role, email, …)`
> recipe is **deprecated**: it leaves the GoTrue-scanned columns NULL. Migration
> `0006` heals any account already created that way — there is no need to delete
> and recreate it — but use `create_bootstrap_admin` for any future bootstrap.

Security model: RLS exposes **read-only, own-rows-or-admin** policies; all
money movement happens inside `SECURITY DEFINER` functions owned by the table
owner, each of which re-checks authorisation; privileged RPCs are revoked from
`PUBLIC`/`anon` and re-granted only to `authenticated`/`service_role`.

## Deployment (Vercel)

`vercel.json` is included. Import the repository in Vercel and deploy — the
framework preset is Next.js. To go live against Supabase, set exactly these
three variables (**all three** — username login needs the service role, which
resolves usernames to emails before Supabase Auth signs in):

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Project URL (Settings → API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | Browser-facing anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **server-only** | Username→email resolution, admin console. Never `NEXT_PUBLIC_`, never in the bundle |

Omit all of them (plus `.env.local`) to deploy in local-demo mode. Details and
the post-deploy checklist live in `docs/ops-notes.md`.

## Branding

Logo areas render the **circular transparent brand mark** shipped at
`public/logo.png` (header, footer, auth pages, dashboard, admin, 404). The
slots are perfectly round (`rounded-full` + `overflow-hidden`), so the mark
sits flush on dark surfaces with no white box around it. Replace the file or
set `NEXT_PUBLIC_LOGO_URL` / `NEXT_PUBLIC_LOGO_MARK_URL` to use your own art —
no code change. The hero video is configured with
`NEXT_PUBLIC_YOUTUBE_VIDEO_ID` (bare ID or any YouTube URL); without it a
poster panel keeps the layout stable.

## Tests

- `scripts/test-supabase-sql.mjs` — migrations + triggers + RPCs + RLS +
  constraints against a real embedded Postgres cluster, including the
  GoTrue-safe first-administrator bootstrap path (72 assertions; run the suite
  with `npm run db:test`).
- The demo adapter is covered by an equivalent flow suite (treasury sends,
  withdrawal lifecycle, refunds, reversals, balance management, ledger order).

## Design reference

`docs/design-reference.md` records every capture supplied by the owner and the
design tokens derived from it (sandy-orange `brand` ramp, 6 px button radius,
tightened card radii, gradient panels).
