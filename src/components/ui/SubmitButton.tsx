"use client";

import { clsx } from "clsx";
import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { InlineSpinner } from "./EmptyState";

/**
 * Submit button wired to the enclosing <form>'s pending state.
 * Must be rendered inside the form element.
 */
export function SubmitButton({
  children,
  variant = "primary",
  className,
  size,
  block,
  disabled,
  pendingLabel,
  icon,
}: {
  children: ReactNode;
  variant?: "primary" | "gold" | "ghost" | "outline" | "danger";
  className?: string;
  size?: "sm" | "md" | "lg";
  block?: boolean;
  disabled?: boolean;
  pendingLabel?: string;
  icon?: ReactNode;
}) {
  const { pending } = useFormStatus();
  const variantClass = {
    primary: "btn-primary",
    gold: "btn-gold",
    ghost: "btn-ghost",
    outline: "btn-outline",
    danger: "btn-danger",
  }[variant];

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      className={clsx(
        variantClass,
        size === "sm" && "btn-sm",
        size === "lg" && "btn-lg",
        block && "btn-block",
        className,
      )}
    >
      {pending ? <InlineSpinner /> : icon}
      <span>{pending && pendingLabel ? pendingLabel : children}</span>
    </button>
  );
}
