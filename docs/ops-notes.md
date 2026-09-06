# Ops notes — Vercel + Supabase deploy

Working notes for taking the sandbox from local demo mode to the hosted
deployment. Companion to `docs/design-reference.md` (visual design captures)
and `README.md` (setup + security model).

## The deployment model

- `main` is the **Supabase production branch**: the project's GitHub
  integration deploys `supabase/migrations/` on every push/merge to `main`.
- Changes reach `main` only through a **PR from the session branch** —
  nothing is pushed to `main` directly.
- Vercel deploys from the same repository. It needs its own env vars; they are
  deliberately **not** in the repo (see `.env.example` for names).

## First-boot checklist (Supabase project already connected to main)

1. **Get the migrations onto the database.** The GitHub integration was
   connected *after* the last merge, so `0001–0004` may never have run. Merge
   a PR into `main` to trigger the sync, then confirm in
   **Supabase dashboard → Database → Migrations** that `0001…0006` appear —
   or in **Table Editor**: `profiles`, `balances`, `asset_config`,
   `admin_emails`, `withdrawals`, `transactions`, `support_threads`,
   `support_messages`, `faqs` with **20 FAQ rows**.
2. **Create the administrator** (a fresh project has zero auth users — the
   demo credentials are local-demo-mode only). Paste this into **Database →
   SQL editor** after the migrations have been applied:

   ```sql
   select public.create_bootstrap_admin(
     'admin@therealworld.demo', 'admin', 'Admin1234!', 'Platform Administrator'
   );
   ```

   `public.create_bootstrap_admin(email, username, password, full_name)` (migration
   `0006`) is the only supported first-admin bootstrap. It pre-authorises the
   address in `public.admin_emails` (so the sign-up trigger grants the admin
   role, and the profile trigger opens the starter balances), writes every
   column GoTrue scans, creates the `auth.identities` email row, and is
   idempotent. `admin` is reserved for ordinary sign-ups; migration `0005`
   carves out pre-authorised addresses only.

   If the `admin` account was created earlier with the old raw
   `insert into auth.users …` SQL editor recipe, call `create_bootstrap_admin`
   with the same email/password — it **heals** the row, filling the NULL token
   columns that produced `500: Database error querying schema
   (sql: Scan error ... converting NULL to string is unsupported)` on password
   login. There is no need to delete and recreate the account.
3. **Vercel env vars — all three must exist:**
   - `NEXT_PUBLIC_SUPABASE_URL` (Project Settings → API)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API)
   - `SUPABASE_SERVICE_ROLE_KEY` — **server-side only**, never `NEXT_PUBLIC_`
     prefixed. Username login calls `findProfileByUsername`, which uses the
     service role; without it username login cannot resolve and admin console
     RPCs fail.
   Then **redeploy** (Deployments → ⋯ → Redeploy) and sign in with
   `admin` / `Admin1234!`.
4. (Optional) `npm run db:seed` to add the six demo members, history and
   support threads to the Supabase project. It now pre-authorises
   `admin@therealworld.demo` in `admin_emails` itself, so the `admin` account
   is created with the admin role even on a fresh database.

## Gotchas (learned the hard way)

- After `npm install` changes or `npm run build`, **restart the dev server
  and remove `.next`** (`rm -rf .next`) or it 500s on a stale webpack manifest.
- **Never commit `.env` / `.env.local`** — they are gitignored. Vercel env
  vars are set in the dashboard only.
- **Every money movement goes through the SECURITY DEFINER functions** in
  `0002` (`credit_funds`, `request_withdrawal`, `admin_review_withdrawal`,
  `admin_set_balance`, cancel/refund). Members must never be able to
  self-credit treasury funds — the functions re-check `is_privileged()` and
  the RLS policies leave balances/transactions/withdrawals write-protected
  over PostgREST.
- The SQL editor bootstrap must use `public.create_bootstrap_admin` (migration
  `0006`). It is idempotent, so re-running it is safe, and it heals an
  administrator row the old raw `insert into auth.users …` recipe left NULL.
- Vercel's Supabase integration applies migrations in filename order and
  refuses partial deploys — keep all `.sql` files in `supabase/migrations/`
  and re-verifiable (`drop ... if exists`, `create or replace`).

## Verification before merging

```bash
npm ci
npm run typecheck
npm run build
# SQL suite (needs the optional deps, not saved to package.json):
npm i --no-save embedded-postgres @embedded-postgres/linux-x64 pg
npm run db:test
```

The demo adapter also has a flow suite: compile `src/lib` to `/tmp` as
CommonJS with a `server-only` stub and exercise treasury sends, withdrawal
lifecycle, refunds, reversals, balance management and ledger order. Keep both
suites green; `scripts/test-supabase-sql.mjs` currently asserts the full
migration set **including** the GoTrue-safe first-administrator bootstrap path
(`0001…0006`, 72 assertions).

## Backlog (owner-supplied)

- Pixel-match desktop marketing pages + dashboard/admin screens against
  screenshots when they arrive.
- Wire `logo.jpg` when the owner re-attaches it: drop it at `public/logo.jpg`
  and commit (slots auto-fill; `NEXT_PUBLIC_LOGO_URL` / `_MARK_URL` override).
- Keep both test suites green; extend them as features land.
