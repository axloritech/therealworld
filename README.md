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

1. Create a project, then apply `supabase/migrations/0001…0004`
   (`supabase db push`, or paste them in the SQL editor in order).
   They are idempotent and seed the asset config and the FAQ knowledge base.
2. Copy `.env.example` → `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only; **never** prefix with
     `NEXT_PUBLIC_`, never commit, never ship to the browser)
   - optional `ADMIN_EMAILS` (comma-separated addresses auto-promoted on sign-up)
3. Optional: `npm run db:seed` for demo data, `npm run db:admin -- you@x.com`
   to grant yourself admin.

Security model: RLS exposes **read-only, own-rows-or-admin** policies; all
money movement happens inside `SECURITY DEFINER` functions owned by the table
owner, each of which re-checks authorisation; privileged RPCs are revoked from
`PUBLIC`/`anon` and re-granted only to `authenticated`/`service_role`.

## Deployment (Vercel)

`vercel.json` is included. Import the repository in Vercel, set the env vars
from `.env.example` (omit all of them to deploy in local-demo mode), and
deploy — the framework preset is Next.js. The service-role key must be added
as a **server-side** environment variable only.

## Branding

All logo areas are intentionally **empty drop-in slots** (header, footer,
auth pages). Set `NEXT_PUBLIC_LOGO_URL` / `NEXT_PUBLIC_LOGO_MARK_URL` later and
every slot fills itself — no code change. The hero video is configured with
`NEXT_PUBLIC_YOUTUBE_VIDEO_ID` (bare ID or any YouTube URL); without it a
poster panel keeps the layout stable.

## Tests

- `scripts/test-supabase-sql.mjs` — migrations + triggers + RPCs + RLS +
  constraints against a real embedded Postgres cluster (42 assertions).
- The demo adapter is covered by an equivalent flow suite (treasury sends,
  withdrawal lifecycle, refunds, reversals, balance management, ledger order).

## Design reference

`docs/design-reference.md` records every capture supplied by the owner and the
design tokens derived from it (sandy-orange `brand` ramp, 6 px button radius,
tightened card radii, gradient panels).
