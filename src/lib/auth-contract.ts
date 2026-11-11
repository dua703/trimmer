/**
 * Frontend auth boundary.
 *
 * Auth UI imports this module instead of talking to a database or HTTP client
 * directly. The teammate owning the backend can replace the implementations in
 * `src/app/actions/auth.ts` (and Auth.js config) without rewriting the landing
 * page components.
 *
 * These helpers never invent a signed-in session. A successful login or
 * register only happens when the backend/auth provider confirms it.
 *
 * Confirmed payloads:
 * - Sign up: firstName, middleName?, lastName, dateOfBirth, email, password
 * - Login: identifier (email or username), password
 *
 * Username login and dedicated name/DOB columns wait on the backend schema.
 * Do not send this data to third-party services from the UI.
 */
export {
  login,
  register,
  logout,
  resendVerification,
  verifyEmail,
} from "@/app/actions/auth";
export type { VerificationActionState } from "@/app/actions/auth";
export type { AuthFormState } from "@/lib/definitions";
