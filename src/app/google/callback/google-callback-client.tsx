"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { completeGoogleHandoff } from "@/app/actions/google-auth";
import { GoogleCallbackStatus } from "@/app/google/callback/google-callback-status";

export function GoogleCallbackClient() {
  const searchParams = useSearchParams();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;

    const code = searchParams.get("code") ?? "";
    void completeGoogleHandoff(code).then((result) => {
      if (result?.error) {
        setError(result.error);
      }
    });
  }, [searchParams]);

  if (error) {
    return (
      <GoogleCallbackStatus
        title="Could not sign you in"
        message={error}
        actionHref="/"
        actionLabel="Return to sign in"
      />
    );
  }

  return (
    <GoogleCallbackStatus
      title="Signing you in"
      message="Completing Google sign-in…"
    />
  );
}
