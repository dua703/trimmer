export const BACKEND_UNAVAILABLE_MESSAGE =
  "The authentication service is unavailable. The form is ready; sign-in will work once the backend is connected.";

export function isRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string" &&
    error.digest.startsWith("NEXT_REDIRECT")
  );
}
