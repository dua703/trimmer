import { Suspense } from "react";
import { GoogleCallbackClient } from "@/app/google/callback/google-callback-client";
import { GoogleCallbackStatus } from "@/app/google/callback/google-callback-status";

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <GoogleCallbackStatus
          title="Signing you in"
          message="Completing Google sign-in…"
        />
      }
    >
      <GoogleCallbackClient />
    </Suspense>
  );
}
