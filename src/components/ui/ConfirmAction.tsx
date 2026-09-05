"use client";

import { clsx } from "clsx";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { idleForm, type FormState } from "@/lib/actions/types";
import { useToast } from "@/components/ui/Toast";

/** A plain form action (no state) — used for one-shot server mutations. */
type SimpleAction = (formData: FormData) => void | Promise<void>;
/** A `useActionState`-style action returning a FormState. */
type StateAction = (prev: FormState, formData: FormData) => Promise<FormState>;

/**
 * A button that opens a confirmation modal wrapping a server action.
 * Accepts either action shape, surfaces the result as a toast and refreshes
 * server data afterwards so balances, badges and tables stay in sync.
 */
export function ConfirmAction({
  action,
  trigger,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Keep it",
  variant = "danger",
  hiddenFields,
  children,
  triggerClassName,
  disabled,
}: {
  action: SimpleAction | StateAction;
  trigger?: ReactNode;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary" | "ghost";
  hiddenFields?: Record<string, string>;
  children?: ReactNode;
  triggerClassName?: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  async function run(formData: FormData) {
    setPending(true);
    try {
      // Two-parameter actions are useActionState handlers.
      if ((action as StateAction).length >= 2) {
        const result = await (action as StateAction)(idleForm, formData);
        if (result.ok) toast(result.message ?? "Done.", "success");
        else toast(result.error ?? "Something went wrong.", "error");
      } else {
        await (action as SimpleAction)(formData);
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast((err as Error).message || "Something went wrong.", "error");
    } finally {
      setPending(false);
    }
  }

  const triggerClass = clsx(
    trigger
      ? undefined
      : variant === "danger"
        ? "btn-danger btn-sm"
        : variant === "primary"
          ? "btn-primary btn-sm"
          : "btn-ghost btn-sm",
    triggerClassName,
  );

  return (
    <>
      {trigger ? (
        <span
          onClick={() => !disabled && setOpen(true)}
          className={triggerClass}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (!disabled) setOpen(true);
            }
          }}
        >
          {trigger}
        </span>
      ) : (
        <button type="button" onClick={() => setOpen(true)} disabled={disabled} className={triggerClass}>
          {children}
        </button>
      )}

      {open ? (
        <div
          className="fixed inset-0 z-100 flex items-end justify-center bg-black/75 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            ref={dialogRef}
            tabIndex={-1}
            className="card-lg w-full max-w-md p-6 outline-none animate-fade-up"
          >
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-lg font-bold text-chalk">{title}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-lg border border-line p-1.5 text-fog transition hover:text-chalk"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {description ? (
              <div className="mt-2 text-sm leading-relaxed text-mist">{description}</div>
            ) : null}

            <form action={run} className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {hiddenFields
                ? Object.entries(hiddenFields).map(([key, value]) => (
                    <input key={key} type="hidden" name={key} value={value} />
                  ))
                : null}
              <button type="button" className="btn-ghost" onClick={() => setOpen(false)} disabled={pending}>
                {cancelLabel}
              </button>
              <button
                type="submit"
                disabled={pending}
                className={clsx(
                  variant === "danger"
                    ? "btn-danger"
                    : variant === "primary"
                      ? "btn-primary"
                      : "btn-ghost",
                )}
              >
                {pending ? "Working…" : confirmLabel}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
