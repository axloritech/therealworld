"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { clsx } from "clsx";
import { logoutAction } from "@/lib/actions/account";

export function SignOutButton({
  className,
  iconOnly = false,
}: {
  className?: string;
  iconOnly?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function signOut() {
    startTransition(async () => {
      await logoutAction();
      router.push("/");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={pending}
      title="Sign out"
      aria-label="Sign out"
      className={clsx(
        iconOnly
          ? "grid h-9 w-9 place-items-center rounded-xl border border-line bg-white/[0.03] text-fog transition hover:border-rose-500/40 hover:text-rose-400"
          : "btn-ghost",
        className,
      )}
    >
      <LogOut className="h-4 w-4" />
      {!iconOnly ? <span>{pending ? "Signing out…" : "Sign out"}</span> : null}
    </button>
  );
}
