"use client";

import { clsx } from "clsx";
import { Check, Info, Loader2, SendHorizonal, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ThreadStatusPill } from "@/components/ui/StatusPill";
import { dayKey, fmtTime } from "@/lib/format";
import type { Role, SupportMessage, ThreadStatus } from "@/lib/types";

const POLL_MS = 5000;

/**
 * Support conversation. Polls the API route every few seconds so both sides see
 * new messages without a page reload. Plain HTTP polling — no realtime socket,
 * no third-party chat service.
 */
export function ChatPanel({
  threadId,
  viewerRole,
  viewerName,
  counterpartyLabel,
  subject,
  initialStatus,
  initialMessages,
}: {
  threadId: string;
  viewerRole: Role;
  viewerName: string;
  counterpartyLabel: string;
  subject: string;
  initialStatus: ThreadStatus;
  initialMessages: SupportMessage[];
}) {
  const [messages, setMessages] = useState<SupportMessage[]>(initialMessages);
  const [status, setStatus] = useState<ThreadStatus>(initialStatus);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollBoxRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<string>(initialMessages[initialMessages.length - 1]?.id ?? "");

  const scrollToBottom = useCallback((smooth = true) => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "end" });
    });
  }, []);

  useEffect(() => {
    scrollToBottom(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (document.hidden) return;
      try {
        const res = await fetch(`/api/support/${threadId}`, { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { messages: SupportMessage[]; thread: { status: ThreadStatus } };
        if (cancelled) return;
        setMessages(json.messages);
        setStatus(json.thread.status);
        setLastSync(new Date());
        const newest = json.messages[json.messages.length - 1]?.id ?? "";
        if (newest && newest !== lastIdRef.current) {
          lastIdRef.current = newest;
          const nearBottom =
            (scrollBoxRef.current?.scrollHeight ?? 0) -
              (scrollBoxRef.current?.scrollTop ?? 0) -
              (scrollBoxRef.current?.clientHeight ?? 0) <
            160;
          if (nearBottom) scrollToBottom();
        }
      } catch {
        /* transient network error — the next tick retries */
      }
    }

    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [threadId, scrollToBottom]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/support/${threadId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Could not send that message.");
      setMessages((prev) => [...prev, json.message as SupportMessage]);
      lastIdRef.current = (json.message as SupportMessage).id;
      setDraft("");
      setLastSync(new Date());
      scrollToBottom();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  // Group messages by day.
  const grouped: { day: string; items: SupportMessage[] }[] = [];
  for (const m of messages) {
    const day = dayKey(m.created_at);
    const last = grouped[grouped.length - 1];
    if (last && last.day === day) last.items.push(m);
    else grouped.push({ day, items: [m] });
  }

  const closed = status === "closed";

  return (
    <section className="card-lg flex h-[min(78vh,46rem)] flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 border-b border-line bg-night-900/70 px-5 py-4">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold text-chalk">{subject}</h2>
          <p className="mt-0.5 flex items-center gap-2 text-[11px] text-fog">
            <span>{counterpartyLabel}</span>
            <span className="h-1 w-1 rounded-full bg-night-600" />
            <span className="flex items-center gap-1">
              {lastSync ? (
                <>
                  <Check className="h-3 w-3 text-mint-400" /> synced {fmtTime(lastSync.toISOString())}
                </>
              ) : (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" /> syncing
                </>
              )}
            </span>
          </p>
        </div>
        <ThreadStatusPill status={status} />
      </header>

      {/* Messages */}
      <div ref={scrollBoxRef} className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-smoke">No messages yet.</p>
        ) : (
          <div className="flex flex-col gap-6">
            {grouped.map((group) => (
              <div key={group.day} className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-line" />
                  <span className="text-[10px] font-bold tracking-[0.16em] text-smoke uppercase">
                    {group.day}
                  </span>
                  <span className="h-px flex-1 bg-line" />
                </div>
                {group.items.map((m) => {
                  const mine = m.sender_role === viewerRole;
                  return (
                    <div
                      key={m.id}
                      className={clsx("flex flex-col gap-1", mine ? "items-end" : "items-start")}
                    >
                      <div
                        className={clsx(
                          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed sm:max-w-[70%]",
                          mine
                            ? "rounded-br-md bg-flare-500/15 text-chalk ring-1 ring-flare-500/25"
                            : "rounded-bl-md bg-night-800 text-mist ring-1 ring-line",
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      </div>
                      <p className="flex items-center gap-1.5 px-1 text-[10px] text-smoke">
                        {m.sender_role === "admin" ? (
                          <ShieldCheck className="h-3 w-3 text-gold-400" />
                        ) : null}
                        {mine ? "You" : m.sender_name} · {fmtTime(m.created_at)}
                      </p>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form onSubmit={send} className="border-t border-line bg-night-900/70 px-4 py-3.5 sm:px-6">
        {error ? (
          <p className="mb-2 rounded-xl border border-rose-500/35 bg-rose-500/[0.08] px-3 py-2 text-xs text-rose-400">
            {error}
          </p>
        ) : null}
        {closed ? (
          <p className="flex items-center gap-2 rounded-xl border border-line bg-white/[0.03] px-3 py-2.5 text-xs text-fog">
            <Info className="h-3.5 w-3.5 shrink-0" />
            This conversation is closed. Start a new one from the support inbox.
          </p>
        ) : (
          <div className="flex items-end gap-2.5">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={1}
              maxLength={4000}
              placeholder={
                viewerRole === "admin"
                  ? "Write a reply… (Enter to send, Shift+Enter for a new line)"
                  : "Write to the support team… (Enter to send, Shift+Enter for a new line)"
              }
              aria-label="Message"
              className="field max-h-32 min-h-[2.75rem] flex-1 resize-y py-2.5"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              aria-label="Send message"
              className="btn-primary h-11 w-11 shrink-0 rounded-2xl px-0"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
            </button>
          </div>
        )}
        <p className="mt-2 text-center text-[10px] text-smoke">
          {viewerName} · messages are stored with your account history
        </p>
      </form>
    </section>
  );
}
