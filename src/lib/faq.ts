import type { FaqItem } from "./types";

/**
 * FAQ content — static, curated, and answered instantly on the client.
 * No AI, no external calls: filtering and expanding happen in the browser.
 * Edit this file (or the `faqs` table in Supabase) to change the answers.
 */
export const FAQ_CATEGORIES = [
  "All",
  "Getting started",
  "Deposits",
  "Withdrawals",
  "Security",
  "Sandbox",
] as const;

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "faq-1",
    category: "Sandbox",
    question: "Is this a real trading platform with real money?",
    answer:
      "No. This is a demonstration and sandbox environment. Every balance, deposit, withdrawal and trade shown here is simulated with demo funds. No real fiat currency and no real cryptocurrency is ever transferred, held or exchanged, and wallet addresses are never broadcast to any blockchain.",
  },
  {
    id: "faq-2",
    category: "Getting started",
    question: "How do I create an account?",
    answer:
      "Choose a unique username, a valid email address and a password of at least 8 characters, then submit the registration form. New sandbox accounts are credited with starter demo balances in BTC, ETH and USDT so you can explore every screen immediately.",
  },
  {
    id: "faq-3",
    category: "Getting started",
    question: "Why must usernames be unique?",
    answer:
      "Your username is your public account identifier — admins use it to look you up, and it appears on withdrawal requests and support conversations. The database enforces a unique constraint, so a duplicate is rejected at sign-up rather than silently merged later.",
  },
  {
    id: "faq-4",
    category: "Getting started",
    question: "Can I log in with my username instead of my email?",
    answer:
      "Yes. The login form accepts either your username or your email address in the same field, along with your password.",
  },
  {
    id: "faq-5",
    category: "Deposits",
    question: "How do I add funds to my demo balances?",
    answer:
      "Open Dashboard → Deposit, pick BTC, ETH or USDT, enter an amount and confirm. The credit is instant and is recorded in your transaction history as a demo deposit. No payment is taken and no on-chain transfer occurs.",
  },
  {
    id: "faq-6",
    category: "Deposits",
    question: "Do deposits require blockchain confirmations?",
    answer:
      "Not in the sandbox — credits are instant so you can test the full flow. The asset reference card still shows the confirmation count a live network would require (2 for Bitcoin, 12 for Ethereum, 19 for Tron) for realism.",
  },
  {
    id: "faq-7",
    category: "Withdrawals",
    question: "How do I request a withdrawal?",
    answer:
      "Go to Dashboard → Withdraw, select the asset and network, enter the amount and paste your destination wallet address, then submit. The request is created with status Pending and the amount is held (deducted from your available balance) until an administrator reviews it.",
  },
  {
    id: "faq-8",
    category: "Withdrawals",
    question: "What does a Pending withdrawal mean?",
    answer:
      "Pending means your request is queued for admin review. Nothing is sent anywhere while it is Pending. An administrator will approve it, reject it, or you can cancel it yourself. Only after approval does the status change — and even then, this being a sandbox, no real funds move.",
  },
  {
    id: "faq-9",
    category: "Withdrawals",
    question: "Can I cancel a withdrawal after submitting it?",
    answer:
      "Yes, as long as it is still Pending. Open Dashboard → Withdrawals and choose Cancel. The held amount is returned to your balance immediately and a refund entry appears in your transaction history.",
  },
  {
    id: "faq-10",
    category: "Withdrawals",
    question: "What happens if a withdrawal is rejected?",
    answer:
      "A rejected request is reversed automatically: the full held amount is credited back to your balance, the original ledger entry is marked reversed, and the admin's reason is stored against the request so you can see why.",
  },
  {
    id: "faq-11",
    category: "Withdrawals",
    question: "Are there minimum, maximum or fee limits?",
    answer:
      "Yes, per asset: BTC 0.0005–5 (fee 0.0002), ETH 0.01–200 (fee 0.004), USDT 20–100,000 (fee 1). The fee is deducted from the payout, and the withdrawal form shows the exact amount you would receive before you submit.",
  },
  {
    id: "faq-12",
    category: "Withdrawals",
    question: "Why was my wallet address rejected?",
    answer:
      "Each network has a strict address format. Bitcoin accepts legacy (1…), nested SegWit (3…) or native SegWit (bc1…); Ethereum, Arbitrum and BNB Smart Chain require 0x followed by 40 hex characters; Tron requires T followed by 33 base58 characters. Make sure the network you selected matches the address you pasted.",
  },
  {
    id: "faq-13",
    category: "Security",
    question: "How is my account protected?",
    answer:
      "Authentication is handled by Supabase Auth with bcrypt-hashed passwords and signed session cookies. Every table is protected by row-level security so a signed-in user can only read their own balances, transactions, withdrawals and support messages. Role checks for admin areas are enforced inside the database, not only in the interface.",
  },
  {
    id: "faq-14",
    category: "Security",
    question: "Who can see my balances and transactions?",
    answer:
      "You, and administrators of this sandbox for review purposes. Row-level security policies restrict all other accounts. Your full history is available to you at Dashboard → Transactions, and every admin action is recorded with a reference and a timestamp.",
  },
  {
    id: "faq-15",
    category: "Security",
    question: "How do I become an administrator?",
    answer:
      "Admin access is granted by an existing administrator from Admin → Users, or automatically for addresses listed in the ADMIN_EMAILS environment variable. There is no self-service route to admin privileges.",
  },
  {
    id: "faq-16",
    category: "Security",
    question: "I forgot my password — what now?",
    answer:
      "In the sandbox, an administrator can reset a demo password from Admin → Users. With Supabase configured, use the standard password-recovery email flow from your project's authentication settings.",
  },
  {
    id: "faq-17",
    category: "Sandbox",
    question: "How do I reach customer support?",
    answer:
      "Open Dashboard → Support and start a conversation with a subject and message. Administrators see every thread in Admin → Support and reply in the same conversation. Your full message history is retained and visible to you at any time.",
  },
  {
    id: "faq-18",
    category: "Sandbox",
    question: "Where do the prices shown on the site come from?",
    answer:
      "They are fixed reference prices bundled with this demo, used only to convert your sandbox balances into an indicative total. They are not live market data, not a price feed, and must not be used for any real trading decision.",
  },
  {
    id: "faq-19",
    category: "Sandbox",
    question: "Can administrators change my balance?",
    answer:
      "Yes — this is a sandbox, so administrators can set demo balances from Admin → Users. Every change writes a signed-off entry to your transaction history labelled Admin adjust, showing the resulting balance and the reason recorded by the administrator.",
  },
  {
    id: "faq-20",
    category: "Sandbox",
    question: "Can this demo be used to take real payments?",
    answer:
      "No, and it must not be. There is no custody, no exchange connectivity, no banking integration and no blockchain signing capability anywhere in this codebase. It exists to demonstrate interface, workflow and role-based administration only.",
  },
];

export const FAQ_COUNT = FAQ_ITEMS.length;
