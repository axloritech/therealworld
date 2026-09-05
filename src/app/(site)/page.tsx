import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { FaqAccordion } from "@/components/marketing/FaqAccordion";
import { HeroVideo } from "@/components/marketing/HeroVideo";
import {
  CommissionPanel,
  CtaBand,
  EconomicAnalysisCard,
  ExperienceMore,
  InstrumentFeatures,
  LearnInvestSection,
  MarketAnalysisSection,
} from "@/components/marketing/sections";
import {
  AccountTiers,
  AnchorBand,
  AnnouncingSection,
  CommittedSection,
  MarketTableSection,
  MobileAppCard,
  PlatformByTraders,
  ProfitCounter,
  Testimonials,
  ThreeSteps,
} from "@/components/marketing/showcase";
import { SectionHeading } from "@/components/ui/EmptyState";
import { HERO_VIDEO, YOUTUBE_TITLE } from "@/lib/config";
import { FAQ_CATEGORIES } from "@/lib/faq";
import { getRepo } from "@/lib/repo";

export default async function HomePage() {
  const faqs = await getRepo().listFaqs();

  return (
    <>
      {/* ══════════════════════════ HERO ══════════════════════════ */}
      <section className="bg-night-1000">
        <div className="container-x pt-14 pb-12 lg:pt-24 lg:pb-16">
          <div className="max-w-3xl">
            <h1 className="text-4xl leading-[1.12] font-extrabold text-chalk sm:text-5xl lg:text-[3.4rem]">
              Get more freedom in
              <br className="hidden sm:block" /> the financial market.
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-relaxed text-mist sm:text-xl">
              Trade Cryptocurrencies, Stock, Indices, Commodities and Forex from a single account.
            </p>

            <div className="mt-9 flex flex-col items-start gap-3.5">
              <Link href="/login" className="btn-brand px-8 py-3 text-[15px]">
                Login
              </Link>
              <Link href="/register" className="btn-brand px-8 py-3 text-[15px]">
                Join Real World Trading Platform
              </Link>
            </div>

            <p className="mt-7 max-w-sm text-[13px] leading-relaxed text-fog">
              Trading in Forex/ CFDs is highly speculative and carries a high level of risk.
            </p>
            <p className="mt-2 max-w-sm text-[12px] leading-relaxed text-smoke">
              This website is a demonstration sandbox: balances, deposits and withdrawals are
              simulated and no real money or cryptocurrency is ever transferred.
            </p>
          </div>

          {/* ── Hero video ── */}
          <div id="tour" className="mt-12 max-w-2xl scroll-mt-28 lg:mt-16">
            <HeroVideo video={HERO_VIDEO} title={YOUTUBE_TITLE} />
          </div>
        </div>
      </section>

      {/* ══════════════════ Less Commission ══════════════════════ */}
      <CommissionPanel />

      {/* ══════════════════ Market analysis ══════════════════════ */}
      <MarketAnalysisSection />

      {/* ═════════════ Mobile app + counter + commitment ═════════ */}
      <MobileAppCard />
      <ProfitCounter />
      <CommittedSection />

      {/* ══════════════════ Account tiers ════════════════════════ */}
      <AccountTiers />

      {/* ══════════════ Anchor band + 3 steps ════════════════════ */}
      <AnchorBand />
      <ThreeSteps />

      {/* ══════════════ Platform + why choose + pillars ══════════ */}
      <PlatformByTraders />
      <InstrumentFeatures />

      {/* ══════════════════ Announcement band ════════════════════ */}
      <AnnouncingSection />

      {/* ══════════════════ Market table + live FX ═══════════════ */}
      <MarketTableSection />

      {/* ══════════════════ Statement + Learn/Invest ═════════════ */}
      <ExperienceMore />
      <LearnInvestSection />

      {/* ══════════════════ Economic Analysis ════════════════════ */}
      <EconomicAnalysisCard />

      {/* ══════════════════ Testimonials ═════════════════════════ */}
      <Testimonials />

      {/* ══════════════════════════ FAQ ══════════════════════════ */}
      <section id="faq" className="container-x scroll-mt-28 py-16 lg:py-24">
        <SectionHeading
          eyebrow="Instant answers"
          title={
            <>
              Questions, <span className="text-gradient">answered immediately</span>
            </>
          }
          description="Search the full knowledge base below — filtering and expansion happen in your browser, so answers appear as you type."
        />
        <div className="mt-12 flex justify-center">
          <FaqAccordion items={faqs} categories={FAQ_CATEGORIES} />
        </div>
        <div className="mt-8 flex justify-center">
          <Link href="/faq" className="btn-ghost">
            Open the full FAQ page
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
