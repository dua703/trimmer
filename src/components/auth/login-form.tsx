"use client";

import { useActionState } from "react";
import { login } from "@/lib/auth-contract";
import { AuthField } from "@/components/auth/auth-field";
import { GoogleButton } from "@/components/auth/google-button";
import { ResendVerification } from "@/components/auth/resend-verification";

const initialState = undefined;

export function LoginForm({
  googleEnabled,
  googleStartUrl,
  onShowSignUp,
}: {
  googleEnabled: boolean;
  googleStartUrl: string;
  onShowSignUp: () => void;
}) {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <div>
      <h1
        className="font-serif text-4xl leading-tight sm:text-[2.75rem]"
        style={{ color: "#4A2040" }}
      >
        Welcome back
      </h1>
      <p className="mt-3 text-[15px] leading-7" style={{ color: "#7A534C" }}>
        Continue your grooming ritual with email or username.
      </p>

      <form action={formAction} className="mt-7 space-y-4" noValidate>
        <AuthField
          id="identifier"
          name="identifier"
          label="Email or username"
          autoComplete="username"
          error={state?.errors?.identifier?.[0]}
        />
        <AuthField
          id="password"
          name="password"
          label="Password"
          type="password"
          revealable
          autoComplete="current-password"
          error={state?.errors?.password?.[0]}
        />

        {state?.message ? (
          <p className="text-sm text-danger" role="alert">
            {state.message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="flex h-12 w-full items-center justify-center rounded-full text-sm font-semibold shadow-[0_12px_28px_rgba(74,32,64,0.22)] transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-[#E8A0A8] focus-visible:outline-none disabled:opacity-70"
          style={{ backgroundColor: "#4A2040", color: "#FFF6EF" }}
        >
          {pending ? "Please wait…" : "Sign In"}
        </button>
      </form>

      {state?.unverifiedEmail ? (
        <ResendVerification email={state.unverifiedEmail} />
      ) : null}

      <div className="my-6 flex items-center gap-3 text-xs tracking-[0.2em] text-coral uppercase">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>

      <GoogleButton enabled={googleEnabled} startUrl={googleStartUrl} />
      {!googleEnabled ? (
        <p id="google-auth-help" className="mt-3 text-xs leading-5 text-muted">
          Continue with Google stays disabled until OAuth credentials are
          available. Sign-in will not invent a session.
        </p>
      ) : null}

      <p className="mt-7 text-sm text-muted">
        Don’t have an account?{" "}
        <button
          type="button"
          onClick={onShowSignUp}
          className="font-semibold text-plum underline decoration-coral underline-offset-4 focus-visible:ring-2 focus-visible:ring-rose-gold focus-visible:outline-none"
        >
          Register
        </button>
      </p>
    </div>
  );
}
