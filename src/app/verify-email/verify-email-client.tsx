"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { resendVerification, verifyEmail } from "@/lib/auth-contract";

type Status = "pending" | "success" | "error";

export function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const started = useRef(false);
  const [status, setStatus] = useState<Status>("pending");
  const [message, setMessage] = useState("");
  const [resendState, resendAction, resending] = useActionState(
    resendVerification,
    undefined,
  );

  useEffect(() => {
    // Tokens are single-use; guard against StrictMode double invocation.
    if (started.current) return;
    started.current = true;

    const token = searchParams.get("token") ?? "";
    void verifyEmail(token).then((result) => {
      if (!result?.ok) {
        setMessage(result?.message ?? "This link is invalid or has expired.");
        setStatus("error");
      } else {
        setMessage(result.message || "Your email is verified.");
        setStatus("success");
      }
    });
  }, [searchParams]);

  const title =
    status === "pending"
      ? "Verifying your email"
      : status === "success"
        ? "Email verified"
        : "Could not verify your email";

  return (
    <main
      className="flex min-h-dvh items-center justify-center px-6 py-16"
      style={{ backgroundColor: "#FFF6EF" }}
    >
      <section className="w-full max-w-[440px] rounded-[2rem] border border-line bg-white/80 p-8 shadow-[0_20px_60px_rgba(59,36,54,0.06)]">
        <p
          className="text-sm tracking-[0.26em] uppercase"
          style={{ color: "#C45C6A" }}
        >
          Email verification
        </p>
        <h1
          className="mt-4 font-serif text-4xl leading-tight"
          style={{ color: "#4A2040" }}
        >
          {title}
        </h1>
        <p
          className="mt-3 text-[15px] leading-7"
          style={{ color: "#7A534C" }}
          role="status"
        >
          {status === "pending" ? "One moment…" : message}
        </p>

        {status === "success" ? (
          <Link
            href="/"
            className="mt-8 flex h-12 w-full items-center justify-center rounded-full text-sm font-semibold"
            style={{ backgroundColor: "#4A2040", color: "#FFF6EF" }}
          >
            Sign in
          </Link>
        ) : null}

        {status === "error" ? (
          <form action={resendAction} className="mt-6 space-y-3">
            <label className="block text-sm text-muted" htmlFor="resend-email">
              Request a new link
            </label>
            <input
              id="resend-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="h-12 w-full rounded-full border border-line bg-white px-5 text-sm"
            />
            <button
              type="submit"
              disabled={resending}
              className="flex h-12 w-full items-center justify-center rounded-full text-sm font-semibold disabled:opacity-60"
              style={{ backgroundColor: "#4A2040", color: "#FFF6EF" }}
            >
              {resending ? "Sending…" : "Resend verification email"}
            </button>
            {resendState?.message ? (
              <p className="text-sm text-muted" role="status">
                {resendState.message}
              </p>
            ) : null}
            {resendState?.error ? (
              <p className="text-sm text-danger" role="alert">
                {resendState.error}
              </p>
            ) : null}
          </form>
        ) : null}
      </section>
    </main>
  );
}
