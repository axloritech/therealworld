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
   **Supabase dashboard → Database → Migrations** that `0001…0005` appear —
   or in **Table Editor**: `profiles`, `balances`, `asset_config`,
   `admin_emails`, `withdrawals`, `transactions`, `support_threads`,
   `support_messages`, `faqs` with **20 FAQ rows**.
2. **Create the administrator** (a fresh project has zero auth users — the
   demo credentials are local-demo-mode only). Paste the bootstrap SQL into
   the SQL editor:

   ```sql
   insert into public.admin_emails (email) values ('admin@therealworld.demo')
   on conflict (email) do nothing;

   insert into auth.users
     (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_user_meta_data, created_at, updated_at, last_sign_in_at)
   values
     (gen_random_uuid(), '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated', 'admin@therealworld.demo',
      crypt('Admin1234!', gen_salt('bf', 10)), now(),
      '{"username":"admin","full_name":"Platform Administrator","role":"admin"}'::jsonb,
      now(), now(), now());
   ```

   If `crypt()` is missing: `extensions.crypt` / `extensions.gen_salt`.
   The `on_auth_user_created` trigger builds the profile, opens starter
   balances and promotes the account (email is on the `admin_emails`
   allow-list) in one transaction. `admin` is reserved for ordinary sign-ups;
   migration `0005` carves out pre-authorised addresses only.
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
- The SQL editor bootstrap must be run **once**. The allow-list insert is
  idempotent; the auth insert fails on the second run (duplicate email /
  username) by design.
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
migration set **including** the first-administrator bootstrap path
(`0001…0005`).

## Backlog (owner-supplied)

- Pixel-match desktop marketing pages + dashboard/admin screens against
  screenshots when they arrive.
- Wire `logo.jpg` when the owner re-attaches it: drop it at `public/logo.jpg`
  and commit (slots auto-fill; `NEXT_PUBLIC_LOGO_URL` / `_MARK_URL` override).
- Keep both test suites green; extend them as features land.
