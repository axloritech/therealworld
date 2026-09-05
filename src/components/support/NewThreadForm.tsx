"use client";

import { clsx } from "clsx";
import { MessageSquarePlus } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FormFeedback } from "@/components/ui/FormFeedback";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { createThreadAction } from "@/lib/actions/support";
import { idleForm, type FormState } from "@/lib/actions/types";
import { LIMITS } from "@/lib/config";

const SUGGESTIONS = [
  "Status of my pending withdrawal",
  "I entered the wrong wallet address",
  "How do I top up my sandbox balance?",
  "Question about a transaction reference",
];

export function NewThreadForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [state, action] = useActionState<FormState, FormData>(createThreadAction, idleForm);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const fieldErrors = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok && state.redirect) {
      const t = setTimeout(() => {
        router.push(state.redirect!);
        router.refresh();
      }, 450);
      return () => clearTimeout(t);
    }
  }, [state, router]);

  return (
    <form
      action={action}
      className={clsx("card-lg flex flex-col gap-5 p-6", compact ? "" : "sm:p-7")}
      noValidate
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-flare-500/25 bg-flare-500/[0.08] text-flare-400">
          <MessageSquarePlus className="h-4.5 w-4.5" />
        </span>
        <div>
          <h2 className="text-base font-bold text-chalk">Start a conversation</h2>
          <p className="mt-0.5 text-sm text-fog">
            An administrator reads and replies in this same thread. Your full history is kept.
          </p>
        </div>
      </div>

      <div>
        <label htmlFor="subject" className="label">
          Subject
        </label>
        <input
          id="subject"
          name="subject"
          type="text"
          required
          maxLength={LIMITS.subject.max}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="What do you need help with?"
          className={clsx("field", fieldErrors.subject && "field-error")}
        />
        {fieldErrors.subject ? <p className="error-text">{fieldErrors.subject}</p> : null}
        <div className="mt-2.5 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSubject(s)}
              className={clsx("chip", subject === s && "chip-active")}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="body" className="label">
          Message
        </label>
        <textarea
          id="body"
          name="body"
          rows={5}
          required
          maxLength={LIMITS.message.max}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Include any reference numbers, amounts and dates so the team can help quickly."
          className={clsx("field resize-y", fieldErrors.body && "field-error")}
        />
        <div className="mt-1.5 flex items-center justify-between gap-3">
          {fieldErrors.body ? (
            <p className="error-text">{fieldErrors.body}</p>
          ) : (
            <p className="hint">Be specific — references and dates speed things up.</p>
          )}
          <span className="shrink-0 text-[11px] text-smoke tabular-nums">
            {body.length}/{LIMITS.message.max}
          </span>
        </div>
      </div>

      <FormFeedback state={state} />

      <SubmitButton variant="primary" size="lg" block pendingLabel="Sending…">
        <MessageSquarePlus className="h-4 w-4" />
        Send to support
      </SubmitButton>
    </form>
  );
}
