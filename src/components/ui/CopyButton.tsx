"use client";

import { clsx } from "clsx";
import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/** Click-to-copy chip used for references and wallet addresses. */
export function CopyButton({
  value,
  label,
  className,
  compact = false,
}: {
  value: string;
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const el = document.createElement("textarea");
      el.value = value;
      document.body.appendChild(el);
      el.select();
      try {
        document.execCommand("copy");
      } catch {
        /* clipboard unavailable — ignore */
      }
      document.body.removeChild(el);
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={copied ? "Copied" : `Copy ${label ?? "value"}`}
      aria-label={copied ? "Copied" : `Copy ${label ?? "value"}`}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-lg border border-line bg-white/[0.03] font-medium text-fog transition hover:border-flare-500/40 hover:text-chalk",
        compact ? "px-1.5 py-1 text-[11px]" : "px-2.5 py-1.5 text-xs",
        copied && "border-mint-500/40 text-mint-400",
        className,
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {!compact && <span>{copied ? "Copied" : label ?? "Copy"}</span>}
    </button>
  );
}
