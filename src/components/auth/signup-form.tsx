"use client";

import { useActionState } from "react";
import { register } from "@/lib/auth-contract";
import {
  type AuthFormState,
  localDateStamp,
  registerFormSchema,
} from "@/lib/definitions";
import { AuthField } from "@/components/auth/auth-field";
import { GoogleButton } from "@/components/auth/google-button";
import { ResendVerification } from "@/components/auth/resend-verification";

const initialState = undefined;

async function submitRegistration(
  prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = registerFormSchema.safeParse({
    firstName: formData.get("firstName"),
    middleName: formData.get("middleName") || undefined,
    lastName: formData.get("lastName"),
    username: formData.get("username"),
    dateOfBirth: formData.get("dateOfBirth"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  return register(prevState, formData);
}

export function SignUpForm({
  googleEnabled,
  googleStartUrl,
  onShowLogin,
}: {
  googleEnabled: boolean;
  googleStartUrl: string;
  onShowLogin: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    submitRegistration,
    initialState,
  );

  if (state?.pendingVerification) {
    return (
      <PendingVerification
        email={state.pendingVerification.email}
        onShowLogin={onShowLogin}
      />
    );
  }

  return (
    <div>
      <h1
        className="font-serif text-4xl leading-tight sm:text-[2.75rem]"
        style={{ color: "#4A2040" }}
      >
        Create your account
      </h1>
      <p className="mt-3 text-[15px] leading-7" style={{ color: "#7A534C" }}>
        Join Trimmer to save scans, routines, and a calmer daily care profile.
      </p>

      <form action={formAction} className="mt-6 space-y-3.5" noValidate>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <AuthField
            id="firstName"
            name="firstName"
            label="First name"
            autoComplete="given-name"
            error={state?.errors?.firstName?.[0]}
          />
          <AuthField
            id="lastName"
            name="lastName"
            label="Last name"
            autoComplete="family-name"
            error={state?.errors?.lastName?.[0]}
          />
        </div>
        <AuthField
          id="middleName"
          name="middleName"
          label="Middle name"
          autoComplete="additional-name"
          required={false}
          error={state?.errors?.middleName?.[0]}
        />
        <AuthField
          id="username"
          name="username"
          label="Username"
          autoComplete="username"
          error={state?.errors?.username?.[0]}
        />
        <AuthField
          id="dateOfBirth"
          name="dateOfBirth"
          label="Date of birth"
          type="date"
          autoComplete="bday"
          max={localDateStamp()}
          error={state?.errors?.dateOfBirth?.[0]}
        />
        <AuthField
          id="email"
          name="email"
          label="Email address"
          type="email"
          autoComplete="email"
          error={state?.errors?.email?.[0]}
        />
        <AuthField
          id="password"
          name="password"
          label="Password"
          type="password"
          revealable
          autoComplete="new-password"
          error={state?.errors?.password?.[0]}
        />
        <AuthField
          id="confirmPassword"
          name="confirmPassword"
          label="Re-enter password"
          type="password"
          revealable
          autoComplete="new-password"
          error={state?.errors?.confirmPassword?.[0]}
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
          {pending ? "Please wait…" : "Create Account"}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs tracking-[0.2em] text-coral uppercase">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>

      <GoogleButton enabled={googleEnabled} startUrl={googleStartUrl} />
      {!googleEnabled ? (
        <p id="google-auth-help" className="mt-3 text-xs leading-5 text-muted">
          Continue with Google stays disabled until OAuth credentials are
          available. Registration will not invent a session.
        </p>
      ) : null}

      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onShowLogin}
          className="font-semibold text-plum underline decoration-coral underline-offset-4 focus-visible:ring-2 focus-visible:ring-rose-gold focus-visible:outline-none"
        >
          Sign In
        </button>
      </p>
    </div>
  );
}

function PendingVerification({
  email,
  onShowLogin,
}: {
  email: string;
  onShowLogin: () => void;
}) {
  return (
    <div>
      <h1
        className="font-serif text-4xl leading-tight sm:text-[2.75rem]"
        style={{ color: "#4A2040" }}
      >
        Check your inbox
      </h1>
      <p className="mt-3 text-[15px] leading-7" style={{ color: "#7A534C" }}>
        We sent a confirmation link to <strong>{email}</strong>. Open it to
        activate your account, then sign in. The link expires in 24 hours.
      </p>

      <ResendVerification email={email} />

      <p className="mt-6 text-sm text-muted">
        Already confirmed?{" "}
        <button
          type="button"
          onClick={onShowLogin}
          className="font-semibold text-plum underline decoration-coral underline-offset-4 focus-visible:ring-2 focus-visible:ring-rose-gold focus-visible:outline-none"
        >
          Sign In
        </button>
      </p>
    </div>
  );
}
