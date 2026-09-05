import { SandboxBar } from "@/components/layout/SandboxBar";
import { SupportLauncher } from "@/components/marketing/SupportLauncher";
import { TickerBar } from "@/components/marketing/TickerBar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { getSessionUser } from "@/lib/auth";
import { getRepo } from "@/lib/repo";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  let user: { username: string; role: string } | null = null;
  try {
    const session = await getSessionUser();
    if (session) user = { username: session.profile.username, role: session.profile.role };
  } catch {
    user = null;
  }
  const mode = getRepo().kind;

  return (
    <div className="flex min-h-dvh flex-col">
      <SandboxBar />
      <TickerBar />
      <SiteHeader user={user} mode={mode} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <SupportLauncher />
    </div>
  );
}
