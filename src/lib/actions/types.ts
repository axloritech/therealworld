import type { ActionResult } from "../types";

/** Shape shared by every `useActionState` form in the app. */
export interface FormState {
  ok: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  redirect?: string;
  /** Bumped on each successful mutation so client effects can react. */
  stamp?: number;
}

export const idleForm: FormState = { ok: false };

export function ok(message?: string, extra?: Partial<FormState>): FormState {
  return { ok: true, message, stamp: Date.now(), ...extra };
}

export function bad(error: string, fieldErrors?: Record<string, string>): FormState {
  return { ok: false, error, fieldErrors, stamp: Date.now() };
}

export function fromActionResult<T>(result: ActionResult<T>, message?: string): FormState {
  if (result.ok) {
    const data = result.data as unknown;
    return ok(message, {
      redirect:
        data && typeof data === "object" && "redirect" in data
          ? String((data as { redirect: string }).redirect)
          : undefined,
    });
  }
  return bad(result.error, result.field ? { [result.field]: result.error } : undefined);
}
