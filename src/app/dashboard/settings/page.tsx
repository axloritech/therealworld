import type { Metadata } from "next";
import { CalendarDays, Database, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { DashboardFrame } from "@/components/dashboard/DashboardFrame";
import { PasswordForm, ProfileForm } from "@/components/dashboard/SettingsForms";
import { SignOutButton } from "@/components/dashboard/SignOutButton";
import { RolePill } from "@/components/ui/StatusPill";
import { requireUser } from "@/lib/auth";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { getRepo } from "@/lib/repo";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const profile = await requireUser("/dashboard/settings");
  const mode = getRepo().kind;

  return (
    <DashboardFrame
      profile={profile}
      title="Account settings"
      subtitle="Your profile, credentials and account metadata."
      badge={<RolePill role={profile.role} />}
      actions={
        profile.role === "admin" ? (
          <Link href="/admin" className="btn-gold btn-sm">
            <ShieldCheck className="h-3.5 w-3.5" />
            Admin console
          </Link>
        ) : undefined
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-6">
          <ProfileForm profile={profile} />
          <PasswordForm />
        </div>

        <aside className="flex flex-col gap-4">
          <div className="card p-5">
            <h2 className="text-xs font-bold tracking-[0.16em] text-fog uppercase">
              Account details
            </h2>
            <dl className="mt-4 flex flex-col gap-3 text-sm">
              <Detail icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Role" value={profile.role === "admin" ? "Administrator" : "Member"} />
              <Detail
                icon={<CalendarDays className="h-3.5 w-3.5" />}
                label="Member since"
                value={fmtDate(profile.created_at)}
              />
              <Detail
                icon={<CalendarDays className="h-3.5 w-3.5" />}
                label="Last seen"
                value={profile.last_seen_at ? fmtDateTime(profile.last_seen_at) : "—"}
              />
              <Detail
                icon={<Database className="h-3.5 w-3.5" />}
                label="Data backend"
                value={mode === "supabase" ? "Supabase (live)" : "Local sandbox"}
              />
              <Detail
                icon={<ShieldCheck className="h-3.5 w-3.5" />}
                label="Status"
                value={profile.is_active ? "Active" : "Suspended"}
              />
            </dl>
          </div>

          <div className="card border-gold-400/25 bg-gold-400/[0.04] p-5">
            <h2 className="text-xs font-bold tracking-[0.16em] text-gold-300 uppercase">
              Sandbox account
            </h2>
            <p className="mt-2.5 text-xs leading-relaxed text-mist">
              This account holds simulated balances only. Nothing here can be converted into real
              money or cryptocurrency, and no personal financial data is processed.
            </p>
            <Link href="/faq" className="btn-outline btn-sm btn-block mt-4">
              Read the sandbox FAQ
            </Link>
          </div>

          <div className="card p-5">
            <h2 className="text-xs font-bold tracking-[0.16em] text-fog uppercase">Session</h2>
            <p className="mt-2.5 text-xs leading-relaxed text-fog">
              Signing out clears your session cookie. Your balances and history stay exactly as they
              are.
            </p>
            <SignOutButton className="btn-danger btn-sm btn-block mt-4" />
          </div>
        </aside>
      </div>
    </DashboardFrame>
  );
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line/60 pb-2.5 last:border-0 last:pb-0">
      <dt className="flex items-center gap-2 text-xs text-fog">
        <span className="text-flare-400/80">{icon}</span>
        {label}
      </dt>
      <dd className="text-right text-xs font-semibold text-mist">{value}</dd>
    </div>
  );
}
