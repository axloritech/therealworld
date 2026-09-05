import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { LIMITS } from "@/lib/config";
import { getRepo } from "@/lib/repo";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ threadId: string }> };

/** Guards a thread: only its owner or an administrator may touch it. */
async function authorised(threadId: string) {
  const session = await getSessionUser();
  if (!session) return { error: NextResponse.json({ error: "Not signed in." }, { status: 401 }) };

  const thread = await getRepo().getThread(threadId);
  if (!thread) {
    return { error: NextResponse.json({ error: "Conversation not found." }, { status: 404 }) };
  }
  const isAdmin = session.profile.role === "admin";
  if (!isAdmin && thread.user_id !== session.profile.id) {
    return { error: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  }
  return { session, thread, isAdmin };
}

/** GET /api/support/:threadId — poll the conversation (used by the chat UI). */
export async function GET(_req: Request, ctx: Ctx) {
  const { threadId } = await ctx.params;
  const guard = await authorised(threadId);
  if ("error" in guard) return guard.error;

  const messages = await getRepo().listMessages(threadId);
  return NextResponse.json({
    thread: {
      id: guard.thread.id,
      subject: guard.thread.subject,
      status: guard.thread.status,
      username: guard.thread.username,
      user_id: guard.thread.user_id,
      created_at: guard.thread.created_at,
      last_message_at: guard.thread.last_message_at,
    },
    messages,
    viewer: { id: guard.session.profile.id, role: guard.session.profile.role },
  });
}

/** POST /api/support/:threadId — append a message from either side. */
export async function POST(req: Request, ctx: Ctx) {
  const { threadId } = await ctx.params;
  const guard = await authorised(threadId);
  if ("error" in guard) return guard.error;

  let payload: { body?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const body = String(payload.body ?? "").trim();
  if (!body) return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
  if (body.length > LIMITS.message.max) {
    return NextResponse.json(
      { error: `Message must be at most ${LIMITS.message.max} characters.` },
      { status: 400 },
    );
  }

  try {
    const message = await getRepo().addMessage({
      threadId,
      senderRole: guard.session.profile.role,
      senderId: guard.session.profile.id,
      senderName: guard.isAdmin
        ? guard.session.profile.full_name || "Support"
        : guard.session.profile.full_name || guard.session.profile.username,
      body,
    });
    if (!message) {
      return NextResponse.json({ error: "Could not send that message." }, { status: 500 });
    }
    return NextResponse.json({ message, status: guard.thread.status });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Could not send that message." },
      { status: 500 },
    );
  }
}
