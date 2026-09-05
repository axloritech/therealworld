"use client";

import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AssetIcon } from "@/components/ui/AssetIcon";
import { FormFeedback } from "@/components/ui/FormFeedback";
import { useToast } from "@/components/ui/Toast";
import { sendTreasuryAction } from "@/lib/actions/admin";
import { idleForm } from "@/lib/actions/types";
import { ASSETS, assetMeta } from "@/lib/config";
import { fmtUsd } from "@/lib/format";
import type { Asset } from "@/lib/types";
import { parseAmount } from "@/lib/validate";

/**
 * "Send from the mock treasury" control on the admin overview.
 * The administrator types a username, picks an asset and an amount; the
 * recipient's sandbox balance is credited and a `treasury` ledger entry is
 * written. The mock $1T balance decreases by the USD value of every send.
 */
export function TreasurySendForm({ remainingUsd }: { remainingUsd: number }) {
  const router = useRouter();
  const toast = useToast();
  const [state, setState] = useState(idleForm);
  const [pending, startTransition] = useTransition();
  const [username, setUsername] = useState("");
  const [asset, setAsset] = useState<Asset>("USDT");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const parsed = parseAmount(amount, asset);
  const previewUsd = Number.isNaN(parsed) ? 0 : parsed * assetMeta(asset).price;

  function submit(formData: FormData) {
    startTransition(async () => {
      const next = await sendTreasuryAction(state, formData);
      setState(next);
      if (next.ok) {
        toast(next.message ?? "Sent.", "success");
        setUsername("");
        setAmount("");
        setNote("");
        router.refresh();
      } else {
        toast(next.error ?? "Could not send those funds.", "error");
      }
    });
  }

  return (
    <form action={submit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div>
          <label className="label" htmlFor="treasury-username">
            Member username
          </label>
          <input
            id="treasury-username"
            name="username"
            className="field"
            placeholder="e.g. adaeze"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="treasury-asset">
            Asset
          </label>
          <select
            id="treasury-asset"
            name="asset"
            className="field"
            value={asset}
            onChange={(e) => setAsset(e.target.value as Asset)}
          >
            {ASSETS.map((a) => (
              <option key={a} value={a}>
                {a} · {assetMeta(a).name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div>
          <label className="label" htmlFor="treasury-amount">
            Amount ({asset})
          </label>
          <input
            id="treasury-amount"
            name="amount"
            className="field tabular-nums"
            placeholder="0.00"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <p className="hint tabular-nums">
            ≈ {fmtUsd(previewUsd)}
            {previewUsd > remainingUsd ? " — exceeds the remaining mock treasury" : ""}
          </p>
        </div>
        <div>
          <label className="label" htmlFor="treasury-note">
            Note (optional)
          </label>
          <input
            id="treasury-note"
            name="note"
            className="field"
            placeholder="Shown in the member's ledger"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={180}
          />
        </div>
      </div>

      <FormFeedback state={state} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[11px] text-smoke">
          <AssetIcon asset={asset} size={18} />
          Credited instantly to the member&apos;s sandbox balance and recorded in their history.
        </p>
        <button type="submit" className="btn-brand" disabled={pending}>
          <Send className="h-4 w-4" aria-hidden="true" />
          {pending ? "Sending…" : "Send from treasury"}
        </button>
      </div>
    </form>
  );
}
