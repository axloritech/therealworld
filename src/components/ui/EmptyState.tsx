import { clsx } from "clsx";
import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-line bg-night-900/40 px-6 py-14 text-center",
        className,
      )}
    >
      {icon ? (
        <span className="grid h-12 w-12 place-items-center rounded-2xl border border-line bg-white/[0.03] text-fog">
          {icon}
        </span>
      ) : null}
      <h3 className="text-base font-bold text-chalk">{title}</h3>
      {description ? <p className="max-w-sm text-sm leading-relaxed text-fog">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex flex-col gap-4",
        align === "center" ? "items-center text-center" : "items-start text-left",
        className,
      )}
    >
      {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
      <h2 className="heading-lg">{title}</h2>
      {description ? <p className={clsx("lead", align === "center" && "max-w-2xl")}>{description}</p> : null}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={clsx(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-night-1000/30 border-t-night-1000",
        className,
      )}
      aria-hidden="true"
    />
  );
}

export function InlineSpinner({ className }: { className?: string }) {
  return (
    <span
      className={clsx(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-flare-500/30 border-t-flare-500",
        className,
      )}
      aria-hidden="true"
    />
  );
}
