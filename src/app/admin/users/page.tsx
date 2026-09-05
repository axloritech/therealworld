import type { Metadata } from "next";
import { Users } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { AdminFrame } from "@/components/admin/AdminFrame";
import { UserSearchBar } from "@/components/admin/UserSearchBar";
import { Avatar } from "@/components/dashboard/AppShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterLinks } from "@/components/ui/FilterLinks";
import { RolePill } from "@/components/ui/StatusPill";
import { requireAdmin } from "@/lib/auth";
import { ASSETS, usdValue } from "@/lib/config";
import { fmtAmount, fmtDate, fmtUsd } from "@/lib/format";
import { getRepo } from "@/lib/repo";
import type { Balances, Role } from "@/lib/types";

export const metadata: Metadata = { title: "Members" };

const PAGE_SIZE = 25;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  const q = first(params.q) ?? "";
  const roleParam = first(params.role);
  const role: Role | undefined = roleParam === "admin" || roleParam === "user" ? roleParam : undefined;
  const page = Math.max(1, Number(first(params.page) ?? "1") || 1);

  const repo = getRepo();
  const { rows, total } = await repo.listProfiles({
    q: q || undefined,
    role,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });
  const balances = await repo.getBalancesFor(rows.map((u) => u.id));

  const counts = await Promise.all([
    repo.listProfiles({ limit: 1 }),
    repo.listProfiles({ role: "admin", limit: 1 }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AdminFrame
      profile={admin}
      title="Members"
      subtitle="Search any account by username, then inspect balances, history and requests."
      badge={
        <span className="badge border-line bg-white/[0.04] text-mist">
          <Users className="h-3.5 w-3.5" />
          {total} shown of {counts[0].total}
        </span>
      }
    >
      <div className="flex flex-col gap-5">
        <Suspense fallback={<div className="skeleton h-12 w-full" />}>
          <UserSearchBar autoFocus={false} />
        </Suspense>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <FilterLinks
            basePath="/admin/users"
            param="role"
            options={[
              { value: "user", label: "Members" },
              { value: "admin", label: "Administrators" },
            ]}
            current={role}
            counts={{ user: counts[0].total - counts[1].total, admin: counts[1].total }}
            extraParams={{ q }}
          />
          {q ? (
            <p className="text-xs text-fog">
              Results for <span className="font-semibold text-chalk">“{q}”</span>
            </p>
          ) : null}
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={<Users className="h-5 w-5" />}
            title={q ? `No accounts match “${q}”` : "No accounts yet"}
            description={
              q
                ? "Check the spelling — usernames are lowercase, and search also matches email and display name."
                : "Registered members will appear here with their sandbox balances."
            }
          />
        ) : (
          <>
            {/* ── Desktop table ── */}
            <div className="hidden overflow-hidden rounded-card border border-line lg:block">
              <table className="w-full border-collapse">
                <thead className="border-b border-line bg-night-900/70">
                  <tr>
                    <th className="th">Member</th>
                    <th className="th">Email</th>
                    <th className="th">Role</th>
                    <th className="th">Joined</th>
                    {ASSETS.map((a) => (
                      <th key={a} className="th text-right">
                        {a}
                      </th>
                    ))}
                    <th className="th text-right">Value</th>
                    <th className="th" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((user) => {
                    const b: Balances = balances[user.id] ?? { BTC: 0, ETH: 0, USDT: 0 };
                    return (
                      <tr
                        key={user.id}
                        className="border-b border-line/60 transition last:border-0 hover:bg-white/[0.02]"
                      >
                        <td className="td">
                          <span className="flex items-center gap-3">
                            <Avatar profile={user} size={34} />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-bold text-chalk">
                                @{user.username}
                              </span>
                              <span className="block truncate text-[11px] text-smoke">
                                {user.full_name ?? "—"}
                              </span>
                            </span>
                          </span>
                        </td>
                        <td className="td">
                          <span className="block max-w-[14rem] truncate text-xs">{user.email}</span>
                          {!user.is_active ? (
                            <span className="badge mt-1 border-rose-500/35 bg-rose-500/10 text-rose-400">
                              Suspended
                            </span>
                          ) : null}
                        </td>
                        <td className="td">
                          <RolePill role={user.role} />
                        </td>
                        <td className="td whitespace-nowrap text-xs">{fmtDate(user.created_at)}</td>
                        {ASSETS.map((a) => (
                          <td key={a} className="td text-right text-xs font-semibold tabular-nums">
                            {fmtAmount(b[a] ?? 0, a)}
                          </td>
                        ))}
                        <td className="td text-right text-xs font-bold text-gold-300 tabular-nums">
                          {fmtUsd(usdValue(b), true)}
                        </td>
                        <td className="td text-right">
                          <Link href={`/admin/users/${user.username}`} className="btn-ghost btn-sm">
                            Open
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Mobile cards ── */}
            <ul className="flex flex-col gap-3 lg:hidden">
              {rows.map((user) => {
                const b: Balances = balances[user.id] ?? { BTC: 0, ETH: 0, USDT: 0 };
                return (
                  <li key={user.id}>
                    <Link href={`/admin/users/${user.username}`} className="card card-hover block p-4">
                      <span className="flex items-start gap-3">
                        <Avatar profile={user} size={38} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-bold text-chalk">
                              @{user.username}
                            </span>
                            <RolePill role={user.role} />
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] text-smoke">
                            {user.full_name ?? "—"} · {user.email}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-sm font-extrabold text-gold-300 tabular-nums">
                            {fmtUsd(usdValue(b), true)}
                          </span>
                          <span className="block text-[10px] text-smoke">joined {fmtDate(user.created_at)}</span>
                        </span>
                      </span>
                      <span className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3">
                        {ASSETS.map((a) => (
                          <span key={a} className="flex flex-col">
                            <span className="text-[10px] font-bold tracking-wider text-smoke uppercase">
                              {a}
                            </span>
                            <span className="text-xs font-bold text-mist tabular-nums">
                              {fmtAmount(b[a] ?? 0, a)}
                            </span>
                          </span>
                        ))}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* ── Pagination ── */}
            {pages > 1 ? (
              <nav className="flex items-center justify-between gap-3" aria-label="Pagination">
                <PaginationLink
                  label="Previous"
                  page={page - 1}
                  disabled={page <= 1}
                  q={q}
                  role={role}
                />
                <span className="text-xs text-fog tabular-nums">
                  Page {page} of {pages}
                </span>
                <PaginationLink
                  label="Next"
                  page={page + 1}
                  disabled={page >= pages}
                  q={q}
                  role={role}
                />
              </nav>
            ) : null}
          </>
        )}
      </div>
    </AdminFrame>
  );
}

function PaginationLink({
  label,
  page,
  disabled,
  q,
  role,
}: {
  label: string;
  page: number;
  disabled: boolean;
  q: string;
  role?: Role;
}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (role) params.set("role", role);
  if (!disabled) params.set("page", String(page));
  const qs = params.toString();
  return disabled ? (
    <span className="btn-ghost btn-sm pointer-events-none opacity-40">{label}</span>
  ) : (
    <Link href={qs ? `/admin/users?${qs}` : "/admin/users"} className="btn-ghost btn-sm">
      {label}
    </Link>
  );
}
