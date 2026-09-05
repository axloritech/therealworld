"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "../auth";
import { ADMIN_MOCK_BALANCE_USD, assetMeta, isAsset } from "../config";
import { getRepo } from "../repo";
import type { Asset, WithdrawalStatus } from "../types";
import { parseAmount, roundTo } from "../validate";
import { bad, ok, type FormState } from "./types";

const REVIEWABLE = ["approved", "rejected", "cancelled"] as const;
type ReviewStatus = (typeof REVIEWABLE)[number];

/** Admin sets an absolute demo balance for one asset. */
export async function adminSetBalanceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();

  const userId = String(formData.get("user_id") ?? "");
  const assetRaw = String(formData.get("asset") ?? "");
  if (!userId) return bad("Missing user.");
  if (!isAsset(assetRaw)) return bad("Choose an asset.", { asset: "Choose an asset." });

  const asset: Asset = assetRaw;
  const amount = parseAmount(formData.get("amount"), asset);
  if (Number.isNaN(amount) || amount < 0) {
    return bad("Enter a balance of zero or more.", { amount: "Enter a balance of zero or more." });
  }
  const note = String(formData.get("note") ?? "").trim().slice(0, 180);

  try {
    await getRepo().setBalance(userId, asset, roundTo(amount, asset), {
      note: note || `Demo balance set by ${admin.username}`,
      actorId: admin.id,
    });
    revalidatePath("/admin", "layout");
    return ok(`${asset} balance set to ${roundTo(amount, asset)} for this account.`);
  } catch (err) {
    return bad((err as Error).message || "Could not update that balance.");
  }
}

/**
 * Administrator sends part of the mock $1T treasury to any account, looked up
 * by username. Writes a `treasury` ledger entry on the recipient so the whole
 * history stays auditable, and refuses to exceed the remaining mock balance.
 */
export async function sendTreasuryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();

  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const assetRaw = String(formData.get("asset") ?? "");
  if (!username) return bad("Enter the member's username.", { username: "Enter a username." });
  if (!isAsset(assetRaw)) return bad("Choose an asset.", { asset: "Choose an asset." });

  const asset: Asset = assetRaw;
  const amount = parseAmount(formData.get("amount"), asset);
  if (Number.isNaN(amount) || amount <= 0) {
    return bad("Enter an amount greater than zero.", { amount: "Enter an amount greater than zero." });
  }
  const rounded = roundTo(amount, asset);
  const note = String(formData.get("note") ?? "").trim().slice(0, 180);

  const target = await getRepo().findProfileByUsername(username);
  if (!target) return bad(`No account found for @${username}.`, { username: `@${username} does not exist.` });
  if (!target.is_active) return bad(`@${target.username} is suspended.`, { username: "This account is suspended." });

  // The treasury is cosmetic, but it still obeys its own books: you cannot
  // send more than the mock balance holds after previous sends.
  const stats = await getRepo().adminStats();
  const remaining = ADMIN_MOCK_BALANCE_USD - stats.treasury_sent_usd;
  const usdValue = rounded * assetMeta(asset).price;
  if (usdValue > remaining) {
    return bad("That exceeds the remaining mock treasury balance.", {
      amount: "Amount exceeds the remaining mock treasury.",
    });
  }

  try {
    const { reference } = await getRepo().creditFunds(target.id, asset, rounded, {
      type: "treasury",
      note: note || `Sent from the admin treasury by @${admin.username}`,
    });
    revalidatePath("/admin", "layout");
    revalidatePath("/dashboard", "layout");
    return ok(`Sent ${rounded} ${asset} to @${target.username} · reference ${reference}.`);
  } catch (err) {
    return bad((err as Error).message || "Could not send those funds.");
  }
}

/** Admin credits demo funds without overwriting the existing balance. */
export async function adminCreditAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();

  const userId = String(formData.get("user_id") ?? "");
  const assetRaw = String(formData.get("asset") ?? "");
  if (!userId) return bad("Missing user.");
  if (!isAsset(assetRaw)) return bad("Choose an asset.", { asset: "Choose an asset." });

  const asset: Asset = assetRaw;
  const amount = parseAmount(formData.get("credit_amount"), asset);
  if (Number.isNaN(amount) || amount <= 0) {
    return bad("Enter an amount greater than zero.", { credit_amount: "Enter an amount greater than zero." });
  }
  const note = String(formData.get("note") ?? "").trim().slice(0, 180);

  try {
    await getRepo().creditFunds(userId, asset, roundTo(amount, asset), {
      type: "bonus",
      note: note || `Credited by ${admin.username}`,
    });
    revalidatePath("/admin", "layout");
    return ok(`Credited ${roundTo(amount, asset)} ${asset}.`);
  } catch (err) {
    return bad((err as Error).message || "Could not credit those funds.");
  }
}

/** Approve / reject / cancel a pending withdrawal request. */
export async function adminReviewWithdrawalAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const rawStatus = String(formData.get("status") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 300);
  if (!id) return bad("Missing request id.");
  if (!REVIEWABLE.includes(rawStatus as ReviewStatus)) {
    return bad("Choose approve, reject or cancel.");
  }
  const status = rawStatus as ReviewStatus;
  if (status === "rejected" && !note) {
    return bad("Add a short reason so the user can see why it was rejected.", {
      note: "A reason is required when rejecting.",
    });
  }

  try {
    const updated = await getRepo().reviewWithdrawal(id, status, { adminId: admin.id, note });
    if (!updated) return bad("That request no longer exists.");
    revalidatePath("/admin", "layout");
    revalidatePath("/dashboard", "layout");
    const verb = status === "approved" ? "approved" : status === "rejected" ? "rejected" : "cancelled";
    const tail =
      status === "approved"
        ? "Recorded as released in the ledger (sandbox only — no real transfer)."
        : "The held amount was returned to the user's balance.";
    return ok(`Request ${updated.reference} ${verb}. ${tail}`);
  } catch (err) {
    return bad((err as Error).message || "Could not review that request.");
  }
}

/** Promote / demote an account. Always refuses to demote the last admin. */
export async function adminSetRoleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();

  const userId = String(formData.get("user_id") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!userId) return bad("Missing user.");
  if (role !== "user" && role !== "admin") return bad("Choose a valid role.");
  if (userId === admin.id && role !== "admin") {
    return bad("You cannot remove your own admin access while signed in.");
  }

  const repo = getRepo();
  if (role === "user") {
    const admins = await repo.listProfiles({ role: "admin", limit: 50 });
    if (admins.rows.filter((a) => a.id !== userId).length === 0) {
      return bad("At least one administrator must remain.");
    }
  }

  try {
    await repo.setRole(userId, role);
    revalidatePath("/admin", "layout");
    return ok(`Role updated to ${role}.`);
  } catch (err) {
    return bad((err as Error).message || "Could not update that role.");
  }
}

/** Suspend / reactivate an account. */
export async function adminSetActiveAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const userId = String(formData.get("user_id") ?? "");
  const isActive = formData.get("is_active") === "true";
  if (!userId) return bad("Missing user.");
  if (userId === admin.id && !isActive) return bad("You cannot suspend your own account.");

  try {
    await getRepo().updateProfile(userId, { is_active: isActive });
    revalidatePath("/admin", "layout");
    return ok(isActive ? "Account reactivated." : "Account suspended — the user can no longer sign in.");
  } catch (err) {
    return bad((err as Error).message || "Could not update that account.");
  }
}

/** Sandbox convenience: reset a demo password from the admin panel. */
export async function adminResetPasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const userId = String(formData.get("user_id") ?? "");
  const password = String(formData.get("new_password") ?? "");
  if (!userId) return bad("Missing user.");
  if (password.length < 8) return bad("Password must be at least 8 characters.", { new_password: "Too short." });

  const done = await getRepo().setPassword(userId, password);
  if (!done) {
    return bad("Password resets need the Supabase service-role key configured on the server.");
  }
  revalidatePath("/admin", "layout");
  return ok("Demo password reset. Share it with the user over a secure channel.");
}
