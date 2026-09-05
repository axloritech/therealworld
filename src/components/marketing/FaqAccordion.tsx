"use client";

import { clsx } from "clsx";
import { ChevronDown, MessageCircleQuestion, Search, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { FaqItem } from "@/lib/types";

/**
 * FAQ with instant answers: filtering, category chips and expansion all happen
 * in the browser on the first keystroke. No AI, no network round-trip.
 */
export function FaqAccordion({
  items,
  categories,
  initialCategory = "All",
  compact = false,
}: {
  items: FaqItem[];
  categories: readonly string[];
  initialCategory?: string;
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const inCategory = category === "All" || item.category === category;
      if (!inCategory) return false;
      if (!q) return true;
      return (
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [items, query, category]);

  return (
    <div className={clsx("w-full", compact ? "max-w-3xl" : "max-w-4xl")}>
      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-fog" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the answers — try “pending”, “withdrawal”, “security”…"
          aria-label="Search frequently asked questions"
          className="field pl-11 pr-11"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded-lg p-1.5 text-fog transition hover:bg-white/[0.06] hover:text-chalk"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {/* Categories */}
      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            aria-pressed={category === c}
            className={clsx("chip shrink-0", category === c && "chip-active")}
          >
            {c}
            <span className="text-[10px] opacity-60">
              {c === "All" ? items.length : items.filter((i) => i.category === c).length}
            </span>
          </button>
        ))}
      </div>

      {/* Results */}
      <p className="mt-4 text-xs text-smoke" aria-live="polite">
        {filtered.length === 0
          ? "No answers match that search."
          : `${filtered.length} answer${filtered.length === 1 ? "" : "s"}${query ? ` for “${query}”` : ""}`}
      </p>

      <div className="mt-3 flex flex-col gap-2.5">
        {filtered.map((item) => {
          const open = openId === item.id;
          return (
            <div
              key={item.id}
              id={item.id}
              className={clsx(
                "card overflow-hidden transition duration-300",
                open && "border-flare-500/35 bg-night-850",
              )}
            >
              <h3>
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : item.id)}
                  aria-expanded={open}
                  aria-controls={`panel-${item.id}`}
                  className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-[10px] font-bold tracking-[0.16em] text-flare-400/80 uppercase">
                      {item.category}
                    </span>
                    <span
                      className={clsx(
                        "text-sm leading-snug font-semibold sm:text-[15px]",
                        open ? "text-chalk" : "text-mist",
                      )}
                    >
                      <Highlight text={item.question} query={query} />
                    </span>
                  </span>
                  <span
                    className={clsx(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-full border transition duration-300",
                      open
                        ? "rotate-180 border-flare-500/50 bg-flare-500/15 text-flare-300"
                        : "border-line text-fog",
                    )}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </span>
                </button>
              </h3>

              <div
                id={`panel-${item.id}`}
                hidden={!open}
                className="grid px-5 pb-5"
                style={{ animation: open ? "fade-up .28s cubic-bezier(.22,1,.36,1) both" : undefined }}
              >
                <div className="divider mb-4" />
                <p className="text-sm leading-relaxed text-mist">
                  <Highlight text={item.answer} query={query} />
                </p>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-line bg-white/[0.03] text-fog">
              <MessageCircleQuestion className="h-5 w-5" />
            </span>
            <p className="text-sm font-semibold text-chalk">Nothing matched that search</p>
            <p className="max-w-sm text-sm text-fog">
              Try a different keyword, or message the team directly — a human replies in the support
              chat inside your dashboard.
            </p>
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              <button type="button" className="btn-ghost btn-sm" onClick={() => { setQuery(""); setCategory("All"); }}>
                Reset search
              </button>
              <Link href="/dashboard/support" className="btn-primary btn-sm">
                Open support chat
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (q.length < 2) return <>{text}</>;
  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${safe})`, "ig"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark key={i} className="rounded bg-flare-500/25 px-0.5 text-flare-200">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}
