"use client";

import { clsx } from "clsx";
import { Eye, EyeOff, KeyRound, LogIn, UserRound } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FormFeedback } from "@/components/ui/FormFeedback";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { loginAction } from "@/lib/actions/account";
import { idleForm, type FormState } from "@/lib/actions/types";

export function LoginForm({
  nextPath,
  notice,
  demoAccounts,
}: {
  nextPath?: string;
  notice?: string;
  demoAccounts?: { label: string; identifier: string; password: string; hint: string }[] | null;
}) {
  const router = useRouter();
  const [state, action] = useActionState<FormState, FormData>(loginAction, idleForm);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    if (state.ok && nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")) {
      router.push(nextPath);
      router.refresh();
    }
  }, [state, nextPath, router]);

  const fieldErrors = state.fieldErrors ?? {};

  return (
    <div className="card-lg w-full p-6 sm:p-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="heading-md">Welcome back</h1>
        <p className="text-sm text-fog">
          Sign in with your username or email to reach your sandbox balances.
        </p>
      </div>

      {notice ? (
        <div className="mt-5 rounded-2xl border border-sky-400/30 bg-sky-400/[0.08] px-4 py-3 text-sm text-sky-400">
          {notice}
        </div>
      ) : null}

      <form action={action} className="mt-6 flex flex-col gap-5" noValidate>
        <div>
          <label htmlFor="identifier" className="label">
            Username or email
          </label>
          <div className="relative">
            <UserRound className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-smoke" />
            <input
              id="identifier"
              name="identifier"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="adaeze or adaeze@example.com"
              className={clsx("field pl-10", fieldErrors.identifier && "field-error")}
              aria-invalid={Boolean(fieldErrors.identifier)}
            />
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="password" className="label">
              Password
            </label>
            <span className="mb-1.5 text-[11px] text-smoke">Minimum 8 characters</span>
          </div>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-smoke" />
            <input
              id="password"
              name="password"
              type={reveal ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={clsx("field pr-11 pl-10", fieldErrors.password && "field-error")}
              aria-invalid={Boolean(fieldErrors.password)}
            />
            <button
              type="button"
              onClick={() => setReveal((v) => !v)}
              aria-label={reveal ? "Hide password" : "Show password"}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-2 text-smoke transition hover:text-chalk"
            >
              {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <FormFeedback state={state} />

        <SubmitButton variant="primary" size="lg" block pendingLabel="Signing in…">
          <LogIn className="h-4 w-4" />
          Sign in
        </SubmitButton>
      </form>

      {demoAccounts && demoAccounts.length > 0 ? (
        <div className="mt-6 rounded-2xl border border-gold-400/25 bg-gold-400/[0.05] p-4">
          <p className="text-[11px] font-bold tracking-[0.16em] text-gold-300 uppercase">
            Sandbox accounts — tap to fill
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {demoAccounts.map((account) => (
              <button
                key={account.identifier}
                type="button"
                onClick={() => {
                  setIdentifier(account.identifier);
                  setPassword(account.password);
                }}
                className="flex items-center justify-between gap-3 rounded-xl border border-line bg-night-900/70 px-3.5 py-2.5 text-left transition hover:border-gold-400/40"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-xs font-bold text-chalk">{account.label}</span>
                  <span className="truncate text-[11px] text-fog">
                    {account.identifier} · {account.password}
                  </span>
                </span>
                <span className="shrink-0 text-[10px] font-bold tracking-wider text-smoke uppercase">
                  {account.hint}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <p className="mt-6 text-center text-sm text-fog">
        No account yet?{" "}
        <Link href="/register" className="font-semibold text-flare-300 hover:text-flare-200">
          Create one free
        </Link>
      </p>
    </div>
  );
}
