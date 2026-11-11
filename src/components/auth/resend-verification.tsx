"use client";

import { useActionState } from "react";
import { resendVerification } from "@/lib/auth-contract";

export function ResendVerification({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState(
    resendVerification,
    undefined,
  );

  return (
    <form action={formAction} className="mt-4">
      <input type="hidden" name="email" value={email} />
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="text-sm font-semibold text-plum underline decoration-coral underline-offset-4 focus-visible:ring-2 focus-visible:ring-rose-gold focus-visible:outline-none disabled:opacity-60"
      >
        {pending ? "Sending…" : "Resend verification email"}
      </button>
      {state?.message ? (
        <p className="mt-2 text-sm text-muted" role="status">
          {state.message}
        </p>
      ) : null}
      {state?.error ? (
        <p className="mt-2 text-sm text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
