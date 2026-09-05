import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Role is read from the database on every request — not from a cookie claim.
  await requireAdmin();
  return <>{children}</>;
}
