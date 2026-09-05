import { Database, PlugZap } from "lucide-react";
import { getRepo } from "@/lib/repo";

/**
 * Thin status bar shown above the header.
 * In sandbox mode it explains where data lives; with Supabase configured it
 * confirms the live connection. Keeps the demo honest at a glance.
 */
export async function SandboxBar() {
  const mode = getRepo().kind;

  if (mode === "supabase") {
    return (
      <div className="border-b border-line bg-night-900/70">
        <div className="container-x flex items-center justify-center gap-2 py-1.5 text-[11px] font-semibold text-mist">
          <PlugZap className="h-3.5 w-3.5 text-mint-400" />
          <span>
            Connected to Supabase — live database.
            <span className="ml-1.5 font-medium text-gold-300">Sandbox funds only, no real transfers.</span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-gold-400/20 bg-gold-400/[0.06]">
      <div className="container-x flex items-center justify-center gap-2 py-1.5 text-center text-[11px] font-semibold text-gold-300">
        <Database className="h-3.5 w-3.5 shrink-0" />
        <span>
          Sandbox mode — running on the local demo database.
          <span className="ml-1.5 hidden font-medium text-gold-200/70 sm:inline">
            Add your Supabase keys to switch to a live project without changing any UI code.
          </span>
        </span>
      </div>
    </div>
  );
}
