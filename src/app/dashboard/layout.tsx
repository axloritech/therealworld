import { requireUser } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Authoritative gate: every /dashboard route needs a signed-in, active account.
  await requireUser();
  return <>{children}</>;
}
