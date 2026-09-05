"use client";

import { clsx } from "clsx";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { FormState } from "@/lib/actions/types";

/** Renders the result of a server action and performs the redirect on success. */
export function FormFeedback({
  state,
  className,
  onNavigate,
}: {
  state?: FormState | null;
  className?: string;
  onNavigate?: (to: string) => void;
}) {
  const router = useRouter();
  const redirect = state?.ok ? state.redirect : undefined;

  useEffect(() => {
    if (!redirect) return;
    const timer = setTimeout(() => {
      if (onNavigate) onNavigate(redirect);
      else router.push(redirect);
      router.refresh();
    }, 400);
    return () => clearTimeout(timer);
  }, [redirect, router, onNavigate]);

  if (!state || (!state.error && !state.message)) return null;

  const isError = Boolean(state.error);
  return (
    <div
      role={isError ? "alert" : "status"}
      className={clsx(
        "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm animate-fade-up",
        isError
          ? "border-rose-500/35 bg-rose-500/[0.08] text-rose-400"
          : "border-mint-500/30 bg-mint-500/[0.08] text-mint-400",
        className,
      )}
    >
      {isError ? (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <p className="leading-relaxed font-medium">
        {isError ? state.error : state.message}
        {redirect ? <span className="ml-1 text-fog">Redirecting…</span> : null}
      </p>
    </div>
  );
}

export function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="error-text flex items-center gap-1.5">
      <X className="h-3 w-3" />
      {message}
    </p>
  );
}
