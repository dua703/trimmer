export const ACCESS_TOKEN_COOKIE = "trimmer_access_token";

export function getAuthApiUrl() {
  return (process.env.AUTH_API_URL || "http://localhost:3000").replace(
    /\/+$/,
    "",
  );
}

export function getGoogleStartUrl() {
  return `${getAuthApiUrl()}/auth/google/start`;
}

export function isGoogleAuthConfigured() {
  return Boolean(getAuthApiUrl());
}

export function googleHandoffErrorMessage(error?: string) {
  switch (error) {
    case "google-not-configured":
      return "Google sign-in is not configured yet.";
    case "google-cancelled":
      return "Google sign-in was cancelled.";
    case "google-state-invalid":
      return "That Google sign-in request expired. Please try again.";
    case "google-verification-failed":
      return "Google could not verify this sign-in. Please try again.";
    default:
      return undefined;
  }
}

export type ExpressPublicUser = {
  id: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  username?: string;
  email?: string;
};
