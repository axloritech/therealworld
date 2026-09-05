import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { SITE } from "@/lib/config";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  applicationName: SITE.name,
  title: {
    default: `${SITE.name} — Demo Crypto Trading Platform`,
    template: `%s · ${SITE.name}`,
  },
  description: `${SITE.name} is a responsive demonstration trading platform: sandbox BTC, ETH and USDT balances, administrator-reviewed withdrawals, full transaction history, instant FAQ answers and human support chat. No real money or cryptocurrency is ever transferred.`,
  keywords: [
    "trading platform demo",
    "sandbox",
    "BTC",
    "ETH",
    "USDT",
    "demo dashboard",
    "admin panel",
  ],
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: `${SITE.name} — Demo Crypto Trading Platform`,
    description:
      "Dark, gold-accented trading interface with sandbox balances, pending withdrawals, admin review, FAQ and support chat. Demonstration only — no real funds.",
    url: SITE.url,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — Demo Crypto Trading Platform`,
    description:
      "Sandbox trading platform demo with BTC, ETH and USDT balances and admin-reviewed withdrawals.",
  },
  icons: {
    // Intentionally blank — set NEXT_PUBLIC_LOGO_MARK_URL or replace src/app/icon.svg.
    icon: SITE.logoMarkUrl || undefined,
    apple: SITE.logoUrl || undefined,
  },
};

export const viewport: Viewport = {
  themeColor: "#050506",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-dvh antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
