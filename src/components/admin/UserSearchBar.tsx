"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Instant user search. Debounces keystrokes into the `q` query parameter so the
 * server component re-queries — results stay linkable and work without JS
 * (the form also submits normally).
 */
export function UserSearchBar({
  placeholder = "Search by username, email or name…",
  paramName = "q",
  autoFocus = false,
}: {
  placeholder?: string;
  paramName?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initial = searchParams.get(paramName) ?? "";
  const [value, setValue] = useState(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setValue(initial), [initial]);

  function push(next: string, replace = true) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.trim()) params.set(paramName, next.trim());
    else params.delete(paramName);
    const qs = params.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    if (replace) router.replace(url, { scroll: false });
    else router.push(url);
  }

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (value === initial) return;
    timer.current = setTimeout(() => push(value), 380);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (timer.current) clearTimeout(timer.current);
        push(value, false);
      }}
      role="search"
      className="relative w-full"
    >
      <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-fog" />
      <input
        type="search"
        name={paramName}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        className="field pl-11 pr-24"
      />
      <div className="absolute top-1/2 right-2.5 flex -translate-y-1/2 items-center gap-1.5">
        {value ? (
          <button
            type="button"
            onClick={() => {
              setValue("");
              push("");
            }}
            aria-label="Clear search"
            className="rounded-lg p-1.5 text-fog transition hover:bg-white/[0.06] hover:text-chalk"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <button type="submit" className="btn-primary btn-sm">
          Search
        </button>
      </div>
    </form>
  );
}
