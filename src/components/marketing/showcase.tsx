import {
  Apple,
  ChartLine,
  CircleAlert,
  Play,
  User,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { Check } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════
   Further home-page sections replicated from the owner's live site
   (mobile captures, 2026-09-05). Copy is verbatim where it was legible;
   anything completed from a cut-off capture is marked in docs/design-reference.md.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Store badges (shared) ─────────────────────────────────────────────── */

function StoreBadges({ compact = false }: { compact?: boolean }) {
  const badges = [
    { icon: Play, top: "Download From", bottom: "Play Store" },
    { icon: Apple, top: "Download From", bottom: "App Store" },
  ];
  return (
    <div className="flex flex-wrap gap-3">
      {badges.map(({ icon: Icon, top, bottom }) => (
        <span
          key={bottom}
          className={`flex items-center gap-3 rounded-md bg-night-700/90 text-white ${
            compact ? "px-4 py-2.5" : "px-5 py-3"
          }`}
        >
          <Icon className={compact ? "h-5 w-5" : "h-6 w-6"} aria-hidden="true" />
          <span className="text-left leading-tight">
            <span className="block text-[11px] font-medium opacity-90">{top}</span>
            <span className="block text-sm font-bold">{bottom}</span>
          </span>
        </span>
      ))}
    </div>
  );
}

/* ── White app card ────────────────────────────────────────────────────── */

export function MobileAppCard() {
  return (
    <section className="container-x py-10 lg:py-14">
      <div className="mx-auto max-w-3xl rounded-card-lg bg-white px-6 py-10 text-night-900 sm:px-10">
        <StoreBadges />
        <hr className="my-8 border-night-900/10" />
        <p className="text-[17px] leading-relaxed text-night-700">
          Trade on a <span className="font-semibold text-[#c0392b]">world class platform</span>{" "}
          without a doubt.
          <br />
          <span className="text-[#c0392b]">Mobile App Coming Soon For all Platform.</span>
        </p>
      </div>
    </section>
  );
}

/* ── Counter + instrument statement ────────────────────────────────────── */

export function ProfitCounter() {
  return (
    <section className="bg-night-1000 py-14 lg:py-20">
      <div className="container-x">
        <div className="flex items-center gap-6">
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-brand-500 sm:h-24 sm:w-24">
            <ChartLine className="h-9 w-9 text-white sm:h-11 sm:w-11" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-4xl font-extrabold text-chalk tabular-nums sm:text-6xl">
              324,978,126
            </span>
            <span className="mt-2 block text-sm tracking-[0.12em] text-fog uppercase sm:text-base">
              Trades opened at profit
            </span>
          </span>
        </div>
        <hr className="my-10 border-line" />
        <p className="mx-auto max-w-2xl text-center text-xl leading-relaxed text-chalk sm:text-2xl">
          Trade &amp; Invest in Stocks, Currencies, Indices, and Commodities (CFDs).
        </p>
      </div>
    </section>
  );
}

/* ── "We are committed…" statement band ────────────────────────────────── */

export function CommittedSection() {
  return (
    <section id="security" className="relative overflow-hidden scroll-mt-28 bg-night-1000 py-20 lg:py-28">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(75%_85%_at_78%_20%,rgba(237,161,67,0.14),transparent_60%),radial-gradient(60%_70%_at_15%_85%,rgba(120,40,20,0.25),transparent_65%)]"
      />
      <div className="container-x relative">
        <h2 className="max-w-2xl text-3xl leading-tight font-extrabold text-chalk sm:text-4xl lg:text-5xl">
          We are committed to meeting your CFD and FX trading needs
        </h2>
        <p className="mt-7 max-w-2xl text-[15px] leading-relaxed text-mist sm:text-base">
          We help your money grow by putting it to work. Not Just by Words. Our experts ensure not
          only that your funds are at work, but are putting carefully planned and strategically
          diversified trading and investment portfolio for risk managed returns, with favourable
          trading conditions.
        </p>
        <div className="mt-12 flex items-end gap-5">
          <span className="text-5xl font-extrabold text-chalk tabular-nums sm:text-6xl">89+</span>
          <span className="pb-1.5 text-sm leading-snug text-mist sm:text-base">
            Countries our Clients currently come from and counting.
          </span>
        </div>
      </div>
    </section>
  );
}

/* ── Account tiers ─────────────────────────────────────────────────────── */

const TIERS = [
  {
    name: "Starter Account",
    sub: "Benefit from industry-leading entry prices",
    cta: "Get Started",
    items: [
      "Minimum Investment: $500",
      "Maximum Investment: $999",
      "Duration: 48 Hours",
      "Personal Account Manager",
      "Financial Plan",
    ],
  },
  {
    name: "Classic Account",
    sub: "Receive even tighter spreads and commissions",
    cta: "Open Account",
    items: [
      "Minimum Investment: $1,000",
      "Maximum Investment: $4,999",
      "Duration: 72 Hours",
      "Personal Account Manager",
      "Financial Plan",
    ],
  },
  {
    name: "Advanced Account",
    sub: "Benefit from industry-leading entry prices",
    cta: "Get Started",
    items: [
      "Minimum Investment: $5,000",
      "Maximum Investment: $9,999",
      "Duration: 7 Days",
      "Personal Account Manager",
      "Financial Plan",
    ],
  },
  {
    name: "Platinum Account",
    sub: "Receive even tighter spreads and commissions",
    cta: "Open Account",
    items: [
      "Minimum Investment: $10,000",
      "Maximum Investment: $50,000",
      "Duration: 2 Weeks",
      "Personal Account Manager",
      "Financial Plan",
    ],
  },
];

export function AccountTiers() {
  return (
    <section className="container-x py-14 lg:py-20">
      <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
        {TIERS.map((tier) => (
          <div
            key={tier.name}
            className="rounded-card-lg border-2 border-brand-500/90 bg-night-950 px-7 py-10 sm:px-9"
          >
            <h3 className="text-2xl font-extrabold tracking-wide text-chalk uppercase sm:text-3xl">
              {tier.name}
            </h3>
            <p className="mt-3 text-[15px] text-fog">{tier.sub}</p>
            <ul className="mt-9 space-y-5">
              {tier.items.map((item) => (
                <li key={item} className="flex items-start gap-3.5 text-[15px] text-chalk sm:text-base">
                  <Check className="mt-1 h-4.5 w-4.5 shrink-0 text-brand-500" strokeWidth={3.5} aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/register"
              className="btn-fade mt-10 inline-flex rounded-md px-7 py-3 text-base font-medium"
            >
              {tier.cta}
            </Link>
          </div>
        ))}
      </div>
      <p className="mx-auto mt-8 max-w-3xl text-center text-xs leading-relaxed text-smoke">
        Sandbox note: account tiers are presented for demonstration only. Every sandbox account
        receives the same simulated BTC, ETH and USDT balances, and no investment, deposit of real
        funds or managed portfolio exists in this environment.
      </p>
    </section>
  );
}

/* ── Anchor band + 3-step gradient ─────────────────────────────────────── */

export function AnchorBand() {
  const links = [
    { label: "Less Commission", href: "#commission" },
    { label: "Globally licensed", href: "#why" },
    { label: "Fund security", href: "#security" },
  ];
  return (
    <nav className="bg-night-1000 py-6" aria-label="Page sections">
      <div className="container-x flex flex-wrap items-center gap-x-10 gap-y-3">
        {links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="text-[15px] font-bold text-chalk transition hover:text-brand-400"
          >
            {link.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

const STEPS = [
  {
    icon: User,
    title: "Register",
    body: "Choose an account type and submit your application",
  },
  {
    icon: Wallet,
    title: "Fund",
    body: "Fund your account using a wide range of funding methods.",
  },
  {
    icon: ChartLine,
    title: "Trade",
    body: "Trade the global markets from a single dashboard.",
  },
];

export function ThreeSteps() {
  return (
    <section className="panel-brand py-20 lg:py-28">
      <div className="container-x text-center">
        <p className="text-base text-white/85 sm:text-lg">
          Start trading with Real World Trading Platform.
        </p>
        <h2 className="mx-auto mt-5 max-w-2xl text-3xl leading-tight font-extrabold text-white sm:text-4xl lg:text-5xl">
          Fast account opening in 3 simple steps
        </h2>
        <div className="mx-auto mt-14 grid max-w-3xl gap-12 sm:grid-cols-3 sm:gap-8">
          {STEPS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex flex-col items-center gap-5">
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-400">
                <Icon className="h-9 w-9 text-white" aria-hidden="true" />
              </span>
              <h3 className="text-xl font-extrabold text-white sm:text-2xl">{title}</h3>
              <p className="max-w-xs text-[15px] leading-relaxed text-white/85">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Platform by traders + why choose ──────────────────────────────────── */

export function PlatformByTraders() {
  return (
    <section className="bg-night-1000 py-20 lg:py-28">
      <div className="container-x">
        {/* CSS-only laptop mockup — no brand artwork */}
        <div className="mx-auto max-w-md" aria-hidden="true">
          <div className="rounded-t-lg border border-night-600 bg-night-800 p-2">
            <div className="aspect-video rounded-sm bg-[radial-gradient(60%_70%_at_50%_45%,rgba(56,130,190,0.5),rgba(8,10,16,0.95)_75%)]" />
          </div>
          <div className="mx-auto h-3 w-[112%] -translate-x-[5.4%] rounded-b-lg bg-night-700" />
        </div>

        <h2 className="mt-12 max-w-xl text-3xl leading-tight font-extrabold text-chalk sm:text-4xl">
          Platform by traders, for traders
        </h2>
        <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-mist sm:text-base">
          Seize your opportunity, with technology built designed to ensure that your deal goes
          through.
        </p>
        <div className="mt-9">
          <StoreBadges compact />
        </div>
      </div>
    </section>
  );
}

/* ── Navy announcement band ────────────────────────────────────────────── */

export function AnnouncingSection() {
  return (
    <section className="bg-[#0c1a3a] py-20 lg:py-28">
      <div className="container-x">
        <span className="inline-flex rounded-pill bg-brand-500 px-5 py-1.5 text-[13px] font-semibold tracking-[0.08em] text-white uppercase">
          Announcing
        </span>
        <h2 className="mt-7 max-w-2xl text-4xl leading-[1.15] font-extrabold text-white sm:text-5xl">
          $4.95 <span className="text-3xl sm:text-4xl">online stocks, currencies &amp; commodities trades</span>
        </h2>
        <p className="mt-7 max-w-xl text-[15px] leading-relaxed text-white/70 sm:text-base">
          Stock Comissions from €3 on US stocks Access 19,000+ stocks across core and emerging
          markets on 36 exchanges worldwide.
        </p>
        <Link
          href="/register"
          className="mt-10 inline-flex rounded-md bg-white px-7 py-3 text-base font-semibold text-night-900 transition hover:bg-white/90"
        >
          Get Started
        </Link>

        <div className="mt-14 rounded-card bg-[#4c618c] px-6 py-12 text-center sm:px-12">
          <h3 className="mx-auto max-w-md text-2xl font-extrabold text-white sm:text-3xl">
            New to investing? Start here.
          </h3>
          <Link href="/register" className="btn-brand mt-8 px-7 py-3 text-base">
            Join Real World Trading Platform
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── Market table + live FX block ──────────────────────────────────────── */

type Row = {
  chip: string;
  chipClass: string;
  name: string;
  value?: string;
  change?: string;
  up?: boolean;
  halted?: boolean;
};

const INDICES: Row[] = [
  { chip: "500", chipClass: "bg-[#b0243a]", name: "S&P 500 Index", value: "7,708.0", change: "-33.1", up: false },
  { chip: "100", chipClass: "bg-[#2ba7c9]", name: "US 100 Cash CFD", value: "29,486.5", change: "28.4", up: true },
  { chip: "30", chipClass: "bg-[#2b6cb0]", name: "Dow Jones Industrial Average", value: "53,226.4", change: "-423.6", up: false },
  { chip: "225", chipClass: "bg-[#34568b]", name: "Nikkei 225", value: "65,020.94", change: "806.46", up: true },
  { chip: "X", chipClass: "bg-[#2b6cb0]", name: "DAX Index", value: "26,046.40", change: "43.08", up: true },
  { chip: "100", chipClass: "bg-[#7a1f3d]", name: "FTSE 100 Index", value: "10,832.2", change: "-1.7", up: false },
];

const FUTURES: Row[] = [
  { chip: "S", chipClass: "bg-night-600", name: "S&P 500", halted: true },
  { chip: "E", chipClass: "bg-night-600", name: "Euro", halted: true },
  { chip: "G", chipClass: "bg-night-600", name: "Gold", halted: true },
];

function MarketRow({ row }: { row: Row }) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-t border-line px-4 py-3.5 sm:grid-cols-[minmax(0,1.4fr)_1fr_1fr] sm:px-5">
      <span className="flex min-w-0 items-center gap-3">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-black text-white ${row.chipClass}`}
          aria-hidden="true"
        >
          {row.chip}
        </span>
        <span className="truncate text-[15px] text-chalk">{row.name}</span>
        {row.halted ? <CircleAlert className="h-3.5 w-3.5 shrink-0 text-rose-500" aria-hidden="true" /> : null}
      </span>
      <span className="text-right text-[15px] text-mist tabular-nums sm:text-base">{row.value ?? ""}</span>
      <span
        className={`w-20 text-right text-[15px] tabular-nums sm:w-auto sm:text-base ${
          row.up ? "text-mint-400" : row.change ? "text-rose-400" : "text-transparent"
        }`}
      >
        {row.change ?? "—"}
      </span>
    </div>
  );
}

export function MarketTableSection() {
  return (
    <section className="bg-night-1000 py-16 lg:py-24">
      <div className="container-x">
        <div className="overflow-hidden rounded-card border border-night-600 bg-night-900">
          <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-4 sm:grid-cols-[minmax(0,1.4fr)_1fr_1fr] sm:px-5">
            <span className="text-[15px] text-fog">Name</span>
            <span className="text-right text-[15px] text-fog">Value</span>
            <span className="w-20 text-right text-[15px] text-fog sm:w-auto">Change</span>
          </div>

          <div className="border-t border-line bg-night-800/80 px-4 py-3 text-sm font-extrabold tracking-[0.08em] text-chalk uppercase sm:px-5">
            Indices
          </div>
          {INDICES.map((row) => (
            <MarketRow key={row.name} row={row} />
          ))}

          <div className="border-t border-line bg-night-800/80 px-4 py-3 text-sm font-extrabold tracking-[0.08em] text-chalk uppercase sm:px-5">
            Futures
          </div>
          {FUTURES.map((row) => (
            <MarketRow key={row.name} row={row} />
          ))}
        </div>
        <p className="mt-3 text-right text-[11px] text-smoke">Simulated quotes for demonstration.</p>

        <div className="mt-16">
          <h2 className="max-w-xl text-3xl leading-tight font-extrabold text-chalk sm:text-4xl">
            Live Fx &amp; Stock Prices
          </h2>
          <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-mist sm:text-base">
            Trade 180 FX spot pairs and 140 forwards across majors, minors, exotics and metals.
          </p>
          <ul className="mt-7 space-y-3.5">
            {["Ultra-competitive pricing", "Transparent spreads on every instrument", "One dashboard for every market"].map(
              (item) => (
                <li key={item} className="flex items-start gap-3 text-[15px] text-chalk">
                  <Check className="mt-1 h-4.5 w-4.5 shrink-0 text-brand-500" strokeWidth={3.5} aria-hidden="true" />
                  {item}
                </li>
              ),
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ── Testimonials ──────────────────────────────────────────────────────── */

const TESTIMONIALS = [
  {
    quote:
      "I'm Hunter Hamilton from North Carolina, Currently living in Arizona with my Family, i came across Real World Trading Platform, while browsing through facebook, I accessed the site and contact them via whatsapp and i started investing with $5000 and am making $51,560.00 Weekly.",
    name: "Hunter Hamilton",
    country: "United States",
    initials: "HH",
  },
  {
    quote:
      "Hello everyone I'm Charlotte from South Africa 🇿🇦 It is very easy to make investments on this platform. They have different payment methods that are secured and easy to use. I have also earned more from my account upgrade with amazing new features added to it thank you all so much ❤️.",
    name: "Charlotte",
    country: "South Africa",
    initials: "C",
  },
];

export function Testimonials() {
  return (
    <section className="container-x py-14 lg:py-20">
      <div className="mx-auto grid max-w-4xl gap-6">
        {TESTIMONIALS.map((t) => (
          <figure
            key={t.name}
            className="rounded-card-lg border-2 border-brand-500/90 bg-night-950 px-7 py-10 text-center sm:px-10"
          >
            <blockquote className="mx-auto max-w-xl text-[17px] leading-relaxed text-chalk sm:text-lg">
              {t.quote}
            </blockquote>
            <figcaption className="mt-8 flex items-center justify-center gap-4 text-left">
              <span
                className="flex h-14 w-14 items-center justify-center rounded-full bg-night-700 text-base font-black text-brand-300"
                aria-hidden="true"
              >
                {t.initials}
              </span>
              <span>
                <span className="block text-lg font-extrabold text-chalk">{t.name}</span>
                <span className="block text-sm tracking-[0.1em] text-fog uppercase">{t.country}</span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="mx-auto mt-8 max-w-2xl text-center text-xs leading-relaxed text-smoke">
        Illustrative content for this demonstration environment — no real accounts, deposits or
        returns exist here.
      </p>
    </section>
  );
}
