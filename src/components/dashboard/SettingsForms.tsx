"use client";

import { clsx } from "clsx";
import { KeyRound, Save, UserRound } from "lucide-react";
import { useActionState } from "react";
import { FormFeedback } from "@/components/ui/FormFeedback";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { changePasswordAction, updateProfileAction } from "@/lib/actions/account";
import { idleForm, type FormState } from "@/lib/actions/types";
import type { Profile } from "@/lib/types";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action] = useActionState<FormState, FormData>(updateProfileAction, idleForm);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="card flex flex-col gap-5 p-6" noValidate>
      <header className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-flare-500/25 bg-flare-500/[0.08] text-flare-400">
          <UserRound className="h-4.5 w-4.5" />
        </span>
        <div>
          <h2 className="text-base font-bold text-chalk">Profile</h2>
          <p className="mt-0.5 text-sm text-fog">
            Your username and email are fixed — they identify you to administrators.
          </p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="username" className="label">
            Username
          </label>
          <input
            id="username"
            type="text"
            value={`@${profile.username}`}
            readOnly
            disabled
            className="field cursor-not-allowed opacity-60"
          />
          <p className="hint">Unique and permanent for this account.</p>
        </div>
        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={profile.email}
            readOnly
            disabled
            className="field cursor-not-allowed opacity-60"
          />
          <p className="hint">Used for sign-in and account recovery.</p>
        </div>
      </div>

      <div>
        <label htmlFor="full_name" className="label">
          Full name
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          maxLength={80}
          defaultValue={profile.full_name ?? ""}
          placeholder="Your name"
          className={clsx("field", errors.full_name && "field-error")}
        />
        {errors.full_name ? <p className="error-text">{errors.full_name}</p> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="phone" className="label">
            Phone <span className="text-smoke normal-case">(optional)</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            maxLength={32}
            defaultValue={profile.phone ?? ""}
            placeholder="+234 …"
            className="field"
          />
        </div>
        <div>
          <label htmlFor="country" className="label">
            Country <span className="text-smoke normal-case">(optional)</span>
          </label>
          <input
            id="country"
            name="country"
            type="text"
            maxLength={64}
            defaultValue={profile.country ?? ""}
            placeholder="Nigeria"
            className="field"
          />
        </div>
      </div>

      <FormFeedback state={state} />

      <div>
        <SubmitButton variant="primary" pendingLabel="Saving…">
          <Save className="h-4 w-4" />
          Save changes
        </SubmitButton>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(changePasswordAction, idleForm);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="card flex flex-col gap-5 p-6" noValidate>
      <header className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-flare-500/25 bg-flare-500/[0.08] text-flare-400">
          <KeyRound className="h-4.5 w-4.5" />
        </span>
        <div>
          <h2 className="text-base font-bold text-chalk">Password</h2>
          <p className="mt-0.5 text-sm text-fog">
            Use at least 8 characters. Changing it does not sign you out elsewhere in this sandbox.
          </p>
        </div>
      </header>

      <div>
        <label htmlFor="current_password" className="label">
          Current password
        </label>
        <input
          id="current_password"
          name="current_password"
          type="password"
          autoComplete="current-password"
          required
          className={clsx("field", errors.current_password && "field-error")}
        />
        {errors.current_password ? <p className="error-text">{errors.current_password}</p> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="new_password" className="label">
            New password
          </label>
          <input
            id="new_password"
            name="new_password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className={clsx("field", errors.new_password && "field-error")}
          />
          {errors.new_password ? <p className="error-text">{errors.new_password}</p> : null}
        </div>
        <div>
          <label htmlFor="confirm_password" className="label">
            Confirm new password
          </label>
          <input
            id="confirm_password"
            name="confirm_password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className={clsx("field", errors.confirm_password && "field-error")}
          />
          {errors.confirm_password ? <p className="error-text">{errors.confirm_password}</p> : null}
        </div>
      </div>

      <FormFeedback state={state} />

      <div>
        <SubmitButton variant="ghost" pendingLabel="Updating…">
          <KeyRound className="h-4 w-4" />
          Update password
        </SubmitButton>
      </div>
    </form>
  );
}
