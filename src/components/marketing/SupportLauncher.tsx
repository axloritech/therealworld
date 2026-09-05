"use client";

import { MessageCircle, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const HIDDEN_KEY = "trw-support-bubble-hidden";

/**
 * Floating help launcher in the bottom-right corner, styled after the
 * reference site's chat widget: a white rounded bubble ("Customer Service —
 * Hi, how can we help?") above a round orange launcher.
 *
 * Ours opens the human support area instead of a third-party widget: the FAQ
 * for instant answers, or the member support desk once signed in. There is no
 * bot and no AI anywhere in the conversation path.
 */
export function SupportLauncher() {
  const [bubbleOpen, setBubbleOpen] = useState(false);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(HIDDEN_KEY) !== "1") setBubbleOpen(true);
    } catch {
      setBubbleOpen(true);
    }
  }, []);

  function dismiss() {
    setBubbleOpen(false);
    try {
      window.sessionStorage.setItem(HIDDEN_KEY, "1");
    } catch {
      /* private mode — nothing to persist */
    }
  }

  return (
    <div className="fixed right-4 bottom-4 z-40 flex flex-col items-end gap-3 sm:right-6 sm:bottom-6">
      {bubbleOpen ? (
        <div className="relative flex w-64 items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.8)]">
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss the support bubble"
            className="absolute top-1.5 right-2 cursor-pointer text-smoke transition hover:text-night-900"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <span className="relative shrink-0">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-black text-brand-700">
              CS
            </span>
            <span
              aria-hidden="true"
              className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-white bg-mint-500"
            />
          </span>
          <span className="min-w-0">
            <span className="block text-[13px] font-bold text-violet-900">Customer Service</span>
            <Link
              href="/support"
              className="mt-0.5 block truncate text-[13px] text-night-800 hover:underline"
            >
              Hi, how can we help?
            </Link>
          </span>
        </div>
      ) : null}

      <Link
        href="/support"
        aria-label="Open customer support"
        title="Customer support — instant FAQ answers and a human support desk"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-[0_16px_40px_-14px_rgba(237,161,67,0.8)] transition hover:scale-105 hover:bg-brand-400"
      >
        <MessageCircle className="h-6 w-6" aria-hidden="true" />
      </Link>
    </div>
  );
}
