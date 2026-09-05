"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "../auth";
import { LIMITS } from "../config";
import { getRepo } from "../repo";
import { bad, ok, type FormState } from "./types";

export async function createThreadAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireUser("/dashboard/support");

  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (subject.length < LIMITS.subject.min) {
    return bad(`Add a subject of at least ${LIMITS.subject.min} characters.`, { subject: "Too short." });
  }
  if (subject.length > LIMITS.subject.max) {
    return bad(`Subject must be at most ${LIMITS.subject.max} characters.`, { subject: "Too long." });
  }
  if (!body) return bad("Write a message so the team knows what you need.", { body: "Required." });
  if (body.length > LIMITS.message.max) {
    return bad(`Message must be at most ${LIMITS.message.max} characters.`, { body: "Too long." });
  }

  try {
    const thread = await getRepo().createThread({
      userId: profile.id,
      username: profile.username,
      subject,
      body,
    });
    revalidatePath("/dashboard", "layout");
    return ok("Conversation started. Our team replies here.", {
      redirect: `/dashboard/support/${thread.id}`,
    });
  } catch (err) {
    return bad((err as Error).message || "Could not start that conversation.");
  }
}

/** Users may close their own thread; admins may close any thread. */
export async function closeThreadAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireUser("/dashboard/support");
  const id = String(formData.get("id") ?? "");
  if (!id) return bad("Missing conversation id.");

  const repo = getRepo();
  const thread = await repo.getThread(id);
  if (!thread) return bad("That conversation no longer exists.");
  if (profile.role !== "admin" && thread.user_id !== profile.id) {
    return bad("You can only manage your own conversations.");
  }

  await repo.setThreadStatus(id, "closed");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/admin", "layout");
  return ok("Conversation closed.");
}

/** Admin-only status change (reopen, mark answered, close). */
export async function setThreadStatusAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { requireAdmin } = await import("../auth");
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id) return bad("Missing conversation id.");
  if (!["open", "answered", "closed"].includes(status)) return bad("Choose a valid status.");

  await getRepo().setThreadStatus(id, status as "open" | "answered" | "closed");
  revalidatePath("/admin", "layout");
  revalidatePath("/dashboard", "layout");
  return ok(`Conversation marked ${status}.`);
}
