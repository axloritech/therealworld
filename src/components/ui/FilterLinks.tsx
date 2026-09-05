import { clsx } from "clsx";
import Link from "next/link";

/**
 * Query-parameter driven filter chips rendered as plain links, so filtering
 * works without JavaScript and is shareable/bookmarkable.
 */
export function FilterLinks({
  basePath,
  param,
  options,
  current,
  counts,
  extraParams,
}: {
  basePath: string;
  param: string;
  options: { value: string; label: string }[];
  current?: string;
  counts?: Record<string, number>;
  extraParams?: Record<string, string>;
}) {
  const hrefFor = (value?: string) => {
    const search = new URLSearchParams();
    if (extraParams) {
      for (const [k, v] of Object.entries(extraParams)) if (v) search.set(k, v);
    }
    if (value) search.set(param, value);
    const qs = search.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      <Link
        href={hrefFor(undefined)}
        className={clsx("chip shrink-0", !current && "chip-active")}
        aria-pressed={!current}
      >
        All
        {counts ? (
          <span className="text-[10px] opacity-60">
            {Object.values(counts).reduce((a, b) => a + b, 0)}
          </span>
        ) : null}
      </Link>
      {options.map((option) => (
        <Link
          key={option.value}
          href={hrefFor(option.value)}
          className={clsx("chip shrink-0", current === option.value && "chip-active")}
          aria-pressed={current === option.value}
        >
          {option.label}
          {counts?.[option.value] !== undefined ? (
            <span className="text-[10px] opacity-60">{counts[option.value]}</span>
          ) : null}
        </Link>
      ))}
    </div>
  );
}
