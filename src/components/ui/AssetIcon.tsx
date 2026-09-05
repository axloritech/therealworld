import { clsx } from "clsx";
import { ASSET_META, assetMeta } from "@/lib/config";
import type { Asset } from "@/lib/types";

/** Circular asset badge (glyph only — no external icons to load). */
export function AssetIcon({
  asset,
  size = 40,
  className,
}: {
  asset: Asset;
  size?: number;
  className?: string;
}) {
  const meta = assetMeta(asset);
  return (
    <span
      className={clsx("relative grid shrink-0 place-items-center rounded-2xl", className)}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(120% 120% at 30% 20%, ${meta.tint}26, ${meta.tint}0d 60%, transparent)`,
        border: `1px solid ${meta.tint}33`,
      }}
      aria-hidden="true"
    >
      <span
        className="font-bold leading-none"
        style={{ color: meta.tint, fontSize: Math.round(size * 0.46) }}
      >
        {meta.glyph}
      </span>
    </span>
  );
}

/** Small coloured dot used in tickers and tables. */
export function AssetDot({ asset, className }: { asset: Asset; className?: string }) {
  const meta = ASSET_META[asset] ?? ASSET_META.USDT;
  return (
    <span
      className={clsx("inline-block h-2 w-2 shrink-0 rounded-full", className)}
      style={{ background: meta.tint, boxShadow: `0 0 12px ${meta.tint}88` }}
      aria-hidden="true"
    />
  );
}
