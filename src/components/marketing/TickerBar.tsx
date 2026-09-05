import { TrendingDown, TrendingUp } from "lucide-react";

/**
 * Market ticker strip — the thin scrolling quote bar that tops every page on
 * the reference site: black background, white instrument names and prices,
 * red for negative changes and green for positive ones.
 *
 * All quotes are synthetic demo values. There is no market data provider and
 * no live feed anywhere in this project.
 */
type Quote = {
  name: string;
  price: string;
  change: string;
  percent: string;
  up: boolean;
  chip?: string;
  chipClass?: string;
};

const QUOTES: Quote[] = [
  { name: "S&P 500 Index", price: "7,708.0", change: "-33.1", percent: "-0.43%", up: false },
  {
    name: "US 100 Cash",
    price: "21,940.6",
    change: "-42.8",
    percent: "-0.19%",
    up: false,
    chip: "100",
    chipClass: "bg-sky-500",
  },
  {
    name: "NASDAQ 100",
    price: "23,410.2",
    change: "+86.4",
    percent: "+0.37%",
    up: true,
    chip: "N",
    chipClass: "bg-brand-600",
  },
  { name: "EUR/USD", price: "1.0842", change: "-0.0018", percent: "-0.17%", up: false },
  { name: "GBP/USD", price: "1.2716", change: "+0.0024", percent: "+0.19%", up: true },
  { name: "XAU/USD", price: "2,412.30", change: "+9.10", percent: "+0.38%", up: true },
  {
    name: "BTC/USD",
    price: "68,250.00",
    change: "+412.00",
    percent: "+0.61%",
    up: true,
    chip: "\u20bf",
    chipClass: "bg-brand-500 text-night-1000",
  },
  { name: "ETH/USD", price: "3,540.20", change: "-22.40", percent: "-0.63%", up: false },
  { name: "USDT/USD", price: "1.0001", change: "+0.0001", percent: "+0.01%", up: true },
];

function QuoteItem({ quote }: { quote: Quote }) {
  return (
    <div className="flex items-center gap-2 border-r border-line px-5 py-2 text-[12px] whitespace-nowrap sm:px-6">
      {quote.chip ? (
        <span
          aria-hidden="true"
          className={`flex h-4.5 w-4.5 items-center justify-center rounded-full text-[9px] font-black text-white ${quote.chipClass}`}
        >
          {quote.chip}
        </span>
      ) : null}
      <span className="font-semibold text-chalk">{quote.name}</span>
      <span aria-hidden="true" className="text-smoke">
        ·
      </span>
      <span className="text-mist tabular-nums">{quote.price}</span>
      <span
        className={`flex items-center gap-1 font-semibold tabular-nums ${
          quote.up ? "text-mint-400" : "text-rose-400"
        }`}
      >
        {quote.up ? (
          <TrendingUp className="h-3 w-3" aria-hidden="true" />
        ) : (
          <TrendingDown className="h-3 w-3" aria-hidden="true" />
        )}
        {quote.change} ({quote.percent})
      </span>
    </div>
  );
}

export function TickerBar() {
  // Duplicated once so the CSS marquee loops without a visible seam.
  const loop = [...QUOTES, ...QUOTES];

  return (
    <div
      className="relative overflow-hidden border-b border-line bg-night-1000"
      title="Demonstration quotes — simulated data, not a live market feed"
    >
      <div className="flex w-max animate-marquee" aria-hidden="false">
        {loop.map((quote, i) => (
          <QuoteItem key={`${quote.name}-${i}`} quote={quote} />
        ))}
        <div className="flex items-center gap-2 border-r border-line px-5 py-2 text-[10px] font-bold tracking-[0.16em] text-smoke uppercase sm:px-6">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse-dot" />
          Demo quotes
        </div>
        <div className="flex items-center gap-2 border-r border-line px-5 py-2 text-[10px] font-bold tracking-[0.16em] text-smoke uppercase sm:px-6">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse-dot" />
          Demo quotes
        </div>
      </div>
      {/* Seamless-loop duplicate */}
      <div className="sr-only" aria-hidden="true">
        {QUOTES.map((q) => `${q.name} ${q.price} ${q.change} (${q.percent})`).join(", ")}
      </div>
      {/* Edge fades */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-night-1000 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-night-1000 to-transparent"
      />
    </div>
  );
}
