"use client";

import { clsx } from "clsx";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

type Tone = "success" | "error" | "info";
type Toast = { id: string; message: string; tone: Tone };
type PushToast = (message: string, tone?: Tone) => void;

const ToastContext = createContext<PushToast>(() => {});

/** App-wide toast host. Wrap once in the root layout. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback<PushToast>((message, tone = "success") => {
    if (!message) return;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev.slice(-3), { id, message, tone }]);
    const timer = setTimeout(() => dismiss(id), tone === "error" ? 7000 : 5200);
    return () => clearTimeout(timer);
  }, [dismiss]);

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-20 z-200 flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:right-6 lg:left-auto lg:items-end lg:px-0"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLeaving(true), 4600);
    return () => clearTimeout(t);
  }, []);

  const Icon =
    toast.tone === "error" ? AlertTriangle : toast.tone === "info" ? AlertTriangle : CheckCircle2;

  return (
    <div
      className={clsx(
        "pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border px-4 py-3 shadow-card backdrop-blur-xl transition-all duration-300",
        toast.tone === "error"
          ? "border-rose-500/40 bg-rose-950/85"
          : toast.tone === "info"
            ? "border-sky-400/35 bg-night-900/95"
            : "border-mint-500/35 bg-night-900/95",
        leaving ? "translate-y-1 opacity-0" : "translate-y-0 opacity-100 animate-fade-up",
      )}
      role="status"
      aria-live="polite"
    >
      <Icon
        className={clsx(
          "mt-0.5 h-4 w-4 shrink-0",
          toast.tone === "error" ? "text-rose-400" : toast.tone === "info" ? "text-sky-400" : "text-mint-400",
        )}
      />
      <p className="flex-1 text-sm leading-relaxed font-medium text-mist">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="shrink-0 rounded-lg p-1 text-smoke transition hover:bg-white/[0.06] hover:text-chalk"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function useToast(): PushToast {
  return useContext(ToastContext);
}
