"use client";

import { clsx } from "clsx";
import {
  AtSign,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { FormFeedback } from "@/components/ui/FormFeedback";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { checkUsernameAction, registerAction } from "@/lib/actions/account";
import { idleForm, type FormState } from "@/lib/actions/types";
import { LIMITS, STARTER_BALANCES } from "@/lib/config";
import { passwordStrength } from "@/lib/validate";

type NameState = "idle" | "checking" | "available" | "taken" | "invalid";

export function RegisterForm() {
  const [state, action] = useActionState<FormState, FormData>(registerAction, idleForm);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [reveal, setReveal] = useState(false);
  const [nameState, setNameState] = useState<NameState>("idle");
  const [nameMessage, setNameMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fieldErrors = state.fieldErrors ?? {};
  const strength = passwordStrength(password);

  // Debounced uniqueness check — usernames are unique across the whole platform.
  useEffect(() => {
    const value = username.trim().toLowerCase();
    if (timer.current) clearTimeout(timer.current);
    if (value.length < LIMITS.username.min) {
      setNameState(value.length === 0 ? "idle" : "invalid");
      setNameMessage(value.length === 0 ? "" : `At least ${LIMITS.username.min} characters.`);
      return;
    }
    setNameState("checking");
    setNameMessage("Checking availability…");
    timer.current = setTimeout(async () => {
      const result = await checkUsernameAction(value);
      setNameState(result.available ? "available" : "taken");
      setNameMessage(result.message);
    }, 420);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [username]);

  const usernameError = fieldErrors.username ?? (nameState === "taken" ? nameMessage : undefined);

  return (
    <div className="card-lg w-full p-6 sm:p-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="heading-md">Open your demo account</h1>
        <p className="text-sm text-fog">
          Takes under a minute. You start with sandbox balances of{" "}
          <span className="font-semibold text-mist">
            {STARTER_BALANCES.BTC} BTC · {STARTER_BALANCES.ETH} ETH ·{" "}
            {STARTER_BALANCES.USDT.toLocaleString("en-US")} USDT
          </span>
          .
        </p>
      </div>

      <form action={action} className="mt-6 flex flex-col gap-5" noValidate>
        {/* Username */}
        <div>
          <label htmlFor="username" className="label">
            Username <span className="text-flare-400">*</span>
          </label>
          <div className="relative">
            <AtSign className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-smoke" />
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              minLength={LIMITS.username.min}
              maxLength={LIMITS.username.max}
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
              placeholder="adaeze"
              className={clsx("field pr-11 pl-10", usernameError && "field-error")}
              aria-invalid={Boolean(usernameError)}
              aria-describedby="username-status"
            />
            <span className="absolute top-1/2 right-3 -translate-y-1/2">
              {nameState === "checking" ? (
                <Loader2 className="h-4 w-4 animate-spin text-fog" />
              ) : nameState === "available" ? (
                <Check className="h-4 w-4 text-mint-400" />
              ) : nameState === "taken" || nameState === "invalid" ? (
                <X className="h-4 w-4 text-rose-400" />
              ) : null}
            </span>
          </div>
          <p
            id="username-status"
            aria-live="polite"
            className={clsx(
              "mt-1.5 flex items-center gap-1.5 text-xs",
              nameState === "available"
                ? "text-mint-400"
                : nameState === "taken" || nameState === "invalid" || usernameError
                  ? "text-rose-400"
                  : "text-smoke",
            )}
          >
            {usernameError ?? nameMessage ?? "Unique across the platform — 3 to 20 characters."}
          </p>
        </div>

        {/* Full name */}
        <div>
          <label htmlFor="full_name" className="label">
            Full name <span className="text-smoke normal-case">(optional)</span>
          </label>
          <div className="relative">
            <UserRound className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-smoke" />
            <input
              id="full_name"
              name="full_name"
              type="text"
              autoComplete="name"
              maxLength={80}
              placeholder="Adaeze Okonkwo"
              className={clsx("field pl-10", fieldErrors.full_name && "field-error")}
            />
          </div>
          {fieldErrors.full_name ? <p className="error-text">{fieldErrors.full_name}</p> : null}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="label">
            Email <span className="text-flare-400">*</span>
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-smoke" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              required
              placeholder="you@example.com"
              className={clsx("field pl-10", fieldErrors.email && "field-error")}
              aria-invalid={Boolean(fieldErrors.email)}
            />
          </div>
          {fieldErrors.email ? <p className="error-text">{fieldErrors.email}</p> : null}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="label">
            Password <span className="text-flare-400">*</span>
          </label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-smoke" />
            <input
              id="password"
              name="password"
              type={reveal ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={LIMITS.password.min}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
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
          {password ? (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex h-1 flex-1 gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={clsx(
                      "h-full flex-1 rounded-full transition-colors",
                      i < strength.score
                        ? strength.score <= 1
                          ? "bg-rose-500"
                          : strength.score === 2
                            ? "bg-gold-400"
                            : "bg-mint-500"
                        : "bg-night-700",
                    )}
                  />
                ))}
              </div>
              <span className="text-[11px] font-semibold text-fog">{strength.label}</span>
            </div>
          ) : null}
        </div>

        {/* Confirm */}
        <div>
          <label htmlFor="confirm" className="label">
            Confirm password <span className="text-flare-400">*</span>
          </label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-smoke" />
            <input
              id="confirm"
              name="confirm"
              type={reveal ? "text" : "password"}
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat your password"
              className={clsx("field pl-10", fieldErrors.confirm && "field-error")}
              aria-invalid={Boolean(fieldErrors.confirm)}
            />
          </div>
          {fieldErrors.confirm ? <p className="error-text">{fieldErrors.confirm}</p> : null}
          {confirm && confirm !== password ? (
            <p className="error-text">Passwords do not match.</p>
          ) : null}
        </div>

        {/* Terms */}
        <label className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-fog">
          <input
            type="checkbox"
            name="terms"
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-line bg-night-850 accent-flare-500"
          />
          <span>
            I understand this is a <span className="font-semibold text-gold-300">demonstration sandbox</span>.
            No real money or cryptocurrency is deposited, held, transferred or withdrawn, and I will
            not use it to collect payments from anyone.
          </span>
        </label>
        {fieldErrors.terms ? <p className="error-text -mt-3">{fieldErrors.terms}</p> : null}

        <FormFeedback state={state} />

        <SubmitButton
          variant="primary"
          size="lg"
          block
          pendingLabel="Creating account…"
          disabled={nameState === "checking" || nameState === "taken"}
        >
          <UserPlus className="h-4 w-4" />
          Create demo account
        </SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-fog">
        Already registered?{" "}
        <Link href="/login" className="font-semibold text-flare-300 hover:text-flare-200">
          Sign in instead
        </Link>
      </p>
    </div>
  );
}
