import { GoogleCallbackStatus } from "@/app/google/callback/google-callback-status";

export default function GoogleCallbackLoading() {
  return (
    <GoogleCallbackStatus
      title="Signing you in"
      message="Completing Google sign-in…"
    />
  );
}
