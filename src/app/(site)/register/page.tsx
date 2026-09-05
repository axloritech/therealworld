import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Create account",
  description:
    "Open a free demo trading account with a unique username and instant sandbox balances in BTC, ETH and USDT.",
};

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create account"
      subtitle="No card, no deposit and no KYC — this is a demonstration environment."
    >
      <RegisterForm />
    </AuthShell>
  );
}
