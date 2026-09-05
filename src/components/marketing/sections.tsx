import {
  ArrowRight,
  Bitcoin,
  Building2,
  ChartColumn,
  Check,
  ChevronDown,
  Droplet,
  Euro,
  FileText,
  Lightbulb,
  Network,
  Play,
  Presentation,
  Puzzle,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { HeroVideo } from "@/components/marketing/HeroVideo";
import { AssetIcon } from "@/components/ui/AssetIcon";
import { MARKET_VIDEO, ASSETS, ASSET_META } from "@/lib/config";
import { fmtUsd } from "@/lib/format";

/* ═══════════════════════════════════════════════════════════════════════════
   Home-page sections, laid out to mirror the owner's live site:
   black canvas, sandy-orange accents, slightly rounded rectangles,
   heavy white headings and small grey supporting copy.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Five instrument pillars with pastel duotone icons ─────────────────── */

const PILLARS = [
  { icon: Network, title: "Wide Range of Trading Instruments", tint: "text-violet-300" },
  { icon: Puzzle, title: "Unparalleled Trading Conditions", tint: "text-sky-300" },
  { icon: Building2, title: "Globally Licensed & Regulated", tint: "text-violet-300" },
  { icon: Presentation, title: "Committed to Forex Education", tint: "text-sky-300" },
  { icon: Trophy, title: "Regular Contests & Promotions", tint: "text-violet-300" },
];

export function InstrumentFeatures() {
  return (
    <section id="why" className="container-x scroll-mt-28 py-14 lg:py-20">
      <div className="mx-auto grid max-w-4xl grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-5">
        {PILLARS.map(({ icon: Icon, title, tint }) => (
          <div key={title} className="flex flex-col items-center gap-4 text-center">
            <Icon className={`h-12 w-12 ${tint}`} strokeWidth={1.4} aria-hidden="true" />
            <h3 className="text-[15px] leading-snug font-bold text-chalk">{title}</h3>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Centred statement with orange underline and scroll cue ────────────── */

export function ExperienceMore() {
  return (
    <section className="container-x py-14 text-center lg:py-20">
      <h2 className="heading-lg mx-auto max-w-2xl">Experience more than Trading.</h2>
      <div aria-hidden="true" className="mx-auto mt-5 h-[3px] w-24 rounded-full bg-brand-500" />
      <p className="lead mx-auto mt-6 max-w-xl">
        The Real World Trading Platform firm was founded on the basis of helping Forex traders get
        the best possible results.
      </p>
      <ChevronDown className="mx-auto mt-8 h-6 w-6 text-brand-500" aria-hidden="true" />
    </section>
  );
}

/* ── "Less Commission" gradient panel with five asset circles ──────────── */

const COMMISSION_ASSETS = [
  { icon: Euro, label: "Forex" },
  { icon: Bitcoin, label: "Crypto" },
  { icon: ChartColumn, label: "Indexes" },
  { icon: FileText, label: "Stocks" },
  { icon: Droplet, label: "Energy" },
];

export function CommissionPanel() {
  return (
    <section id="commission" className="container-x scroll-mt-28 py-6 lg:py-10">
      <div className="panel-brand rounded-card px-6 py-10 sm:px-10 lg:px-14 lg:py-14">
        <h2 className="max-w-md text-3xl leading-tight font-extrabold text-white sm:text-4xl">
          Less
          <br />
          Commission
        </h2>
        <div className="mt-9 grid grid-cols-3 gap-6 sm:grid-cols-5 sm:gap-4">
          {COMMISSION_ASSETS.map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-3">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-night-1000 sm:h-16 sm:w-16">
                <Icon className="h-6 w-6 text-brand-500 sm:h-7 sm:w-7" aria-hidden="true" />
              </span>
              <span className="text-sm font-bold text-white">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Market analysis block with icon, copy and media card ──────────────── */

export function MarketAnalysisSection() {
  return (
    <section className="container-x py-14 lg:py-20">
      <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
        <div>
          <Lightbulb className="h-12 w-12 text-brand-200" strokeWidth={1.4} aria-hidden="true" />
          <h2 className="heading-md mt-6 max-w-md text-2xl sm:text-3xl">
            Market analysis and trade inspiration
          </h2>
          <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-mist">
            With a thriving network of experts, being a client of Real World Trading Platform opens
            doors to many opportunities. Powerful market insight and the top trade setups in the
            industry. You will have extensive connections to professional traders.
          </p>
          <p className="mt-4 max-w-lg text-xs text-smoke">
            In this sandbox the analysis library is represented by the platform tour video and the
            instant FAQ — no third-party feeds and no generated content.
          </p>
        </div>

        <HeroVideo
          video={MARKET_VIDEO}
          title="Market analysis and trade inspiration"
          label="Watch the analysis reel"
        />
      </div>
    </section>
  );
}

/* ── Learn / Invest cards with orange borders and checklists ───────────── */

const LEARN_INVEST = [
  {
    title: "Learn",
    sub: "Knowledge to get started",
    items: [
      "FREE Demo Account",
      "Step-by step tutorials & articles",
      "Online webinars",
      "Your own Account Manager",
    ],
  },
  {
    title: "Invest",
    sub: "Choose the best portfolio",
    items: [
      "No need to be experienced",
      "Large number of strategies",
      "Profit whenever Managers earn",
      "Full control of your Investment",
    ],
  },
];

export function LearnInvestSection() {
  return (
    <section className="container-x py-6 lg:py-10">
      <div className="grid gap-5 md:grid-cols-2">
        {LEARN_INVEST.map((card) => (
          <div
            key={card.title}
            className="rounded-card border border-brand-600/80 bg-night-950 px-6 py-8 sm:px-8"
          >
            <h3 className="text-2xl font-bold text-chalk">{card.title}</h3>
            <p className="mt-2 text-[11px] font-semibold tracking-[0.14em] text-fog uppercase">
              {card.sub}
            </p>
            <ul className="mt-6 space-y-3.5">
              {card.items.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-mist">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" strokeWidth={3} aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/register" className="btn-fade mt-8 inline-flex rounded-md px-6 py-2.5 text-sm font-semibold">
              Open Account
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── "Economic Analysis" media card ────────────────────────────────────── */

export function EconomicAnalysisCard() {
  return (
    <section className="container-x py-14 lg:py-20">
      <a
        href="#tour"
        className="group relative block overflow-hidden rounded-card border border-line"
      >
        <div
          aria-hidden="true"
          className="aspect-[16/8] w-full bg-[radial-gradient(60%_80%_at_75%_30%,rgba(237,161,67,0.18),transparent_60%),linear-gradient(200deg,#1a1a20_0%,#08080a_70%)]"
        />
        <div className="absolute inset-0 flex items-center">
          <div className="flex items-stretch gap-4 pl-6 sm:pl-10">
            <span aria-hidden="true" className="w-1.5 rounded-full bg-brand-500" />
            <span>
              <span className="block text-3xl font-extrabold text-violet-200 sm:text-4xl">
                Economic
              </span>
              <span className="mt-1 block text-2xl font-medium text-violet-300/80 sm:text-3xl">
                Analysis
              </span>
            </span>
          </div>
        </div>
        <span className="absolute right-6 bottom-5 flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 shadow-lg transition group-hover:scale-105">
          <Play className="h-5 w-5 fill-night-1000 text-night-1000" aria-hidden="true" />
        </span>
      </a>
    </section>
  );
}

/* ── Closing call to action ────────────────────────────────────────────── */

export function CtaBand() {
  return (
    <section className="container-x py-20 lg:py-24">
      <div className="card-flare relative overflow-hidden rounded-card-lg px-6 py-14 text-center sm:px-12 lg:py-20">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(80%_120%_at_50%_-20%,rgba(237,161,67,0.26),transparent_65%)]"
        />
        <div className="relative flex flex-col items-center gap-6">
          <h2 className="heading-lg max-w-2xl">
            Get more freedom in the financial market.
          </h2>
          <p className="lead max-w-xl">
            Open a free sandbox account with a unique username, explore BTC, ETH and USDT balances,
            and walk a withdrawal from Pending to reviewed — nothing real ever moves.
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className="btn-brand btn-lg">
              Join Real World Trading Platform
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className="btn-ghost btn-lg">
              Login
            </Link>
          </div>
          <p className="max-w-md text-xs text-smoke">
            Trading in Forex/ CFDs is highly speculative and carries a high level of risk. This
            demonstration environment transfers no real money and no real cryptocurrency.
          </p>
        </div>
      </div>
    </section>
  );
}

/** Compact asset reference used inside the dashboard. */
export function AssetReferenceRow({ asset }: { asset: (typeof ASSETS)[number] }) {
  const meta = ASSET_META[asset];
  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <span className="flex items-center gap-2 text-fog">
        <AssetIcon asset={asset} size={22} />
        {meta.name}
      </span>
      <span className="font-semibold text-mist tabular-nums">{fmtUsd(meta.price)}</span>
    </div>
  );
}
