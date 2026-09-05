"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "../auth";
import { DEPOSIT_LIMITS, assetMeta, isAsset } from "../config";
import { getRepo } from "../repo";
import type { Asset } from "../types";
import {
  isValidNetwork,
  networksFor,
  parseAmount,
  validateAddress,
  validateAmount,
} from "../validate";
import { bad, ok, type FormState } from "./types";

export async function depositAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireUser("/dashboard/deposit");

  const assetRaw = String(formData.get("asset") ?? "");
  if (!isAsset(assetRaw)) return bad("Choose an asset.", { asset: "Choose an asset." });

  const asset = assetRaw;
  const limits = DEPOSIT_LIMITS[asset];
  const amount = parseAmount(formData.get("amount"), asset);

  if (Number.isNaN(amount) || amount <= 0) {
    return bad("Enter an amount greater than zero.", { amount: "Enter an amount greater than zero." });
  }
  if (amount < limits.min) {
    return bad(`Minimum demo deposit is ${limits.min} ${asset}.`, { amount: "Below minimum." });
  }
  if (amount > limits.max) {
    return bad(`Maximum demo deposit is ${limits.max} ${asset}.`, { amount: "Above maximum." });
  }

  try {
    const result = await getRepo().creditFunds(profile.id, asset, amount, {
      type: "deposit",
      note: `Demo deposit · ${assetMeta(asset).name} · credited instantly`,
    });
    revalidatePath("/dashboard", "layout");
    return ok(
      `${amount.toLocaleString("en-US", { maximumFractionDigits: 8 })} ${asset} credited to your sandbox balance. Reference ${result.reference}.`,
    );
  } catch (err) {
    return bad((err as Error).message || "Could not credit that deposit.");
  }
}

export async function withdrawAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireUser("/dashboard/withdraw");

  const assetRaw = String(formData.get("asset") ?? "");
  if (!isAsset(assetRaw)) return bad("Choose an asset.", { asset: "Choose an asset." });
  const asset = assetRaw;

  const network = String(formData.get("network") ?? networksFor(asset)[0]?.id ?? "");
  if (!isValidNetwork(asset, network)) {
    return bad("Choose a supported network for this asset.", { network: "Unsupported network." });
  }

  const address = String(formData.get("wallet_address") ?? "").trim();
  const addressError = validateAddress(asset, network, address);
  if (addressError) return bad(addressError, { wallet_address: addressError });

  const balances = await getRepo().getBalances(profile.id);
  const { error, amount, fee, payout } = validateAmount(
    formData.get("amount"),
    asset,
    balances[asset],
  );
  if (error) return bad(error, { amount: error });

  try {
    const withdrawal = await getRepo().createWithdrawal({
      userId: profile.id,
      asset,
      amount,
      fee,
      payout,
      network,
      walletAddress: address,
    });
    revalidatePath("/dashboard", "layout");
    return ok(
      `Withdrawal request ${withdrawal.reference} submitted. Status: Pending — an administrator must review it before anything else happens.`,
    );
  } catch (err) {
    return bad((err as Error).message || "Could not submit that withdrawal request.");
  }
}

export async function cancelWithdrawalAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireUser("/dashboard/withdrawals");
  const id = String(formData.get("id") ?? "");
  if (!id) return bad("Missing request id.");

  try {
    const updated = await getRepo().cancelWithdrawal(id, profile.id);
    if (!updated) return bad("That request no longer exists.");
    revalidatePath("/dashboard", "layout");
    return ok(
      `Request ${updated.reference} cancelled. ${updated.amount} ${updated.asset} returned to your balance.`,
    );
  } catch (err) {
    return bad((err as Error).message || "Could not cancel that request.");
  }
}
