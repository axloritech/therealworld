"use client";

import { clsx } from "clsx";
import { KeyRound, ShieldCheck, UserCog, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/Toast";
import {
  adminResetPasswordAction,
  adminSetActiveAction,
  adminSetRoleAction,
} from "@/lib/actions/admin";
import { idleForm } from "@/lib/actions/types";
import type { Profile } from "@/lib/types";

/**
 * Administrator account controls: role, suspension and a sandbox password reset.
 * Every action goes through a server action that re-checks `requireAdmin()`.
 */
export function AccountControls({
  target,
  viewer,
}: {
  target: Profile;
  viewer: Profile;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [resetOpen, setResetOpen] = useState(false);
  const [password, setPassword] = useState("");

  const isSelf = target.id === viewer.id;

  function run(
    action: typeof adminSetRoleAction,
    fields: Record<string, string>,
  ) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.set(k, v);
    startTransition(async () => {
      const result = await action(idleForm, fd);
      if (result.ok) toast(result.message ?? "Account updated.", "success");
      else toast(result.error ?? "Could not update that account.", "error");
      router.refresh();
    });
  }

  return (
    <div className="card overflow-hidden">
      <header className="flex items-center gap-2.5 border-b border-line bg-night-900/70 px-5 py-4">
        <UserCog className="h-4 w-4 text-gold-400" />
        <h2 className="text-sm font-bold text-chalk">Administration</h2>
        {isSelf ? (
          <span className="ml-auto badge border-flare-500/30 bg-flare-500/10 text-flare-300">
            This is you
          </span>
        ) : null}
      </header>

      <div className="flex flex-col gap-5 p-5">
        {/* Role */}
        <div className="rounded-2xl border border-line bg-night-850/50 p-4">
          <p className="label">Role</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending || target.role === "user"}
              onClick={() => run(adminSetRoleAction, { user_id: target.id, role: "user" })}
              className={clsx(
                target.role === "user" ? "btn-primary btn-sm" : "btn-ghost btn-sm",
              )}
            >
              Member
            </button>
            <button
              type="button"
              disabled={pending || target.role === "admin" || isSelf}
              onClick={() => run(adminSetRoleAction, { user_id: target.id, role: "admin" })}
              className={clsx(
                target.role === "admin" ? "btn-gold btn-sm" : "btn-ghost btn-sm",
              )}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Administrator
            </button>
          </div>
          <p className="hint">
            Administrators can read every account, set demo balances and review withdrawals.
          </p>
        </div>

        {/* Status */}
        <div className="rounded-2xl border border-line bg-night-850/50 p-4">
          <p className="label">Account status</p>
          <p className="text-sm text-mist">
            {target.is_active ? (
              <>
                <span className="font-bold text-mint-400">Active</span> — this member can sign in and
                use the platform.
              </>
            ) : (
              <>
                <span className="font-bold text-rose-400">Suspended</span> — sign-in is blocked until
                you reactivate the account.
              </>
            )}
          </p>
          <button
            type="button"
            disabled={pending || isSelf}
            onClick={() =>
              run(adminSetActiveAction, {
                user_id: target.id,
                is_active: target.is_active ? "false" : "true",
              })
            }
            className={clsx("mt-3", target.is_active ? "btn-danger btn-sm" : "btn-primary btn-sm")}
          >
            {target.is_active ? "Suspend account" : "Reactivate account"}
          </button>
          {isSelf ? <p className="hint">You cannot suspend your own account.</p> : null}
        </div>

        {/* Password reset */}
        <div className="rounded-2xl border border-line bg-night-850/50 p-4">
          <p className="label">Sandbox password reset</p>
          {!resetOpen ? (
            <>
              <p className="text-sm text-fog">
                Set a temporary password for this account. Share it over a secure channel.
              </p>
              <button
                type="button"
                onClick={() => setResetOpen(true)}
                className="btn-ghost btn-sm mt-3"
              >
                <KeyRound className="h-3.5 w-3.5" />
                Reset password
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2.5">
              <div className="relative">
                <KeyRound className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-smoke" />
                <input
                  type="text"
                  value={password}
                  minLength={8}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New temporary password (8+ characters)"
                  aria-label="New temporary password"
                  className="field pl-10"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pending || password.length < 8}
                  onClick={() => {
                    run(adminResetPasswordAction, { user_id: target.id, new_password: password });
                    setResetOpen(false);
                    setPassword("");
                  }}
                  className="btn-primary btn-sm flex-1"
                >
                  {pending ? "Working…" : "Set password"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResetOpen(false);
                    setPassword("");
                  }}
                  className="btn-ghost btn-sm"
                  aria-label="Cancel password reset"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="hint">
                Requires the Supabase service-role key when running against a live project.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
