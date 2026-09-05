import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { DEMO_ADMIN_PASSWORD, DEMO_PASSWORD } from "@/lib/demo-store";
import { getRepo } from "@/lib/repo";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your sandbox trading account with a username or email.",
};

type Params = Record<string, string | string[] | undefined>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  const next = first(params.next);
  const error = first(params.error);
  const welcome = first(params.welcome);

  const notice =
    welcome === "confirm"
      ? "Account created. Check your inbox to confirm your email address, then sign in here."
      : error === "suspended"
        ? "This account is suspended. Contact support from the FAQ page for help."
        : error === "forbidden"
          ? "That area needs administrator access. You have been returned to your dashboard."
          : undefined;

  // Sandbox accounts are offered only in demo mode, and only ever with fixture credentials.
  const demoAccounts =
    getRepo().kind === "demo"
      ? [
          {
            label: "Administrator",
            identifier: "admin",
            password: DEMO_ADMIN_PASSWORD,
            hint: "Admin panel",
          },
          {
            label: "Member",
            identifier: "adaeze",
            password: DEMO_PASSWORD,
            hint: "Dashboard",
          },
        ]
      : null;

  return (
    <AuthShell
      title="Sign in"
      subtitle="Protected area. Sessions are stored in signed httpOnly cookies."
    >
      <LoginForm nextPath={next} notice={notice} demoAccounts={demoAccounts} />
    </AuthShell>
  );
}
