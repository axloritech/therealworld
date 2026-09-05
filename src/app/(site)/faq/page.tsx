import type { Metadata } from "next";
import { ArrowRight, MessageSquareText } from "lucide-react";
import Link from "next/link";
import { FaqAccordion } from "@/components/marketing/FaqAccordion";
import { SectionHeading } from "@/components/ui/EmptyState";
import { FAQ_CATEGORIES } from "@/lib/faq";
import { getRepo } from "@/lib/repo";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Instant answers about sandbox balances, withdrawal review, account security and the administrator console.",
};

export default async function FaqPage() {
  const faqs = await getRepo().listFaqs();

  return (
    <div className="container-x py-16 lg:py-24">
      <SectionHeading
        eyebrow="Help centre"
        title={
          <>
            Frequently asked <span className="text-gradient">questions</span>
          </>
        }
        description="Every answer resolves instantly in your browser. If something is not covered here, message the team from your dashboard and a human replies in the same thread."
      />

      <div className="mt-12 flex justify-center">
        <FaqAccordion items={faqs} categories={FAQ_CATEGORIES} />
      </div>

      <div className="mx-auto mt-14 grid max-w-4xl gap-4 sm:grid-cols-2">
        <div className="card flex flex-col gap-3 p-6">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-flare-500/25 bg-flare-500/[0.08] text-flare-400">
            <MessageSquareText className="h-4.5 w-4.5" />
          </span>
          <h3 className="text-base font-bold text-chalk">Still stuck?</h3>
          <p className="text-sm leading-relaxed text-fog">
            Open a support conversation from your dashboard. Administrators see it immediately and
            reply in the same thread — the full history stays with your account.
          </p>
          <Link href="/dashboard/support" className="btn-outline btn-sm mt-1 w-fit">
            Contact support
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="card flex flex-col gap-3 border-gold-400/25 bg-gold-400/[0.04] p-6">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-gold-400/25 bg-gold-400/[0.08] text-gold-300">
            <ArrowRight className="h-4.5 w-4.5" />
          </span>
          <h3 className="text-base font-bold text-chalk">This is a sandbox</h3>
          <p className="text-sm leading-relaxed text-mist">
            Balances are simulated, withdrawals are reviewed by administrators and never broadcast to
            any blockchain, and the prices shown are fixed demo references rather than live market
            data.
          </p>
          <Link href="/register" className="btn-primary btn-sm mt-1 w-fit">
            Open a demo account
          </Link>
        </div>
      </div>
    </div>
  );
}
