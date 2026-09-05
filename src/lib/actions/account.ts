"use server";

import { revalidatePath } from "next/cache";

import { changePassword, signIn, signOut, signUp } from "../auth";
import { LIMITS } from "../config";
import { getRepo } from "../repo";
import { validateFullName, validateUsername } from "../validate";
import { bad, fromActionResult, ok, type FormState } from "./types";

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const fieldErrors: Record<string, string> = {};

  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const accepted = formData.get("terms") === "on";

  const usernameError = validateUsername(username);
  if (usernameError) fieldErrors.username = usernameError;
  if (fullName) {
    const nameError = validateFullName(fullName);
    if (nameError) fieldErrors.full_name = nameError;
  }
  if (password !== confirm) fieldErrors.confirm = "Passwords do not match.";
  if (!accepted) fieldErrors.terms = "Please accept the sandbox terms to continue.";
  if (Object.keys(fieldErrors).length > 0) {
    return bad("Please fix the highlighted fields.", fieldErrors);
  }

  // Second uniqueness check right before writing (the database also enforces it).
  const repo = getRepo();
  if (await repo.usernameTaken(username)) {
    return bad("That username is already taken. Try another.", {
      username: "That username is already taken.",
    });
  }

  const result = await signUp({ username, email, password, full_name: fullName || undefined });
  if (!result.ok) {
    return bad(result.error, result.field ? { [result.field]: result.error } : undefined);
  }
  revalidatePath("/", "layout");
  return ok("Account created.", { redirect: result.data.redirect });
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const result = await signIn({ identifier, password });
  if (!result.ok) {
    return bad(result.error, result.field ? { [result.field]: result.error } : undefined);
  }
  revalidatePath("/", "layout");
  return ok("Signed in.", { redirect: result.data.redirect });
}

export async function logoutAction(): Promise<void> {
  await signOut();
  revalidatePath("/", "layout");
}

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { getSessionUser } = await import("../auth");
  const session = await getSessionUser();
  if (!session) return bad("You need to be signed in.");

  const fullName = String(formData.get("full_name") ?? "").trim().slice(0, 80);
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 32) || null;
  const country = String(formData.get("country") ?? "").trim().slice(0, 64) || null;

  const nameError = validateFullName(fullName);
  if (nameError) return bad(nameError, { full_name: nameError });

  await getRepo().updateProfile(session.profile.id, {
    full_name: fullName || null,
    phone,
    country,
  });

  revalidatePath("/dashboard", "layout");
  revalidatePath("/admin", "layout");
  return ok("Profile updated.");
}

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const currentPassword = String(formData.get("current_password") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (!currentPassword) return bad("Enter your current password.", { current_password: "Required." });
  if (newPassword.length < LIMITS.password.min) {
    return bad(`Password must be at least ${LIMITS.password.min} characters.`, {
      new_password: "Too short.",
    });
  }
  if (newPassword !== confirm) {
    return bad("Passwords do not match.", { confirm_password: "Passwords do not match." });
  }

  const result = await changePassword({ currentPassword, newPassword });
  return fromActionResult(result, "Password changed.");
}

/** Public helper used by the registration form to check availability as you type. */
export async function checkUsernameAction(username: string): Promise<{
  available: boolean;
  message: string;
}> {
  const normalised = String(username ?? "").trim().toLowerCase();
  const error = validateUsername(normalised);
  if (error) return { available: false, message: error };
  const taken = await getRepo().usernameTaken(normalised);
  return taken
    ? { available: false, message: "That username is already taken." }
    : { available: true, message: "That username is available." };
}
