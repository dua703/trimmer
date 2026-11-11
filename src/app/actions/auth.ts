"use server";

import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { getAuthApiUrl } from "@/lib/auth-api";
import {
  clearAccessTokenCookie,
  getAccessToken,
  setAccessTokenCookie,
} from "@/lib/auth-session";
import { BACKEND_UNAVAILABLE_MESSAGE } from "@/lib/backend";
import {
  type AuthFormState,
  loginSchema,
  registerFormSchema,
} from "@/lib/definitions";

type ExpressAuthResponse = {
  accessToken?: string;
  expiresIn?: number;
  error?: string;
  code?: string;
  email?: string;
  message?: string;
  recoveryKeys?: string[];
  requiresEmailVerification?: boolean;
  details?: Array<{ field: string; message: string }>;
};

export type VerificationActionState =
  | { message?: string; error?: string }
  | undefined;

const VERIFICATION_TOKEN = /^[A-Za-z0-9_-]{43}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function mapFieldErrors(
  details?: Array<{ field: string; message: string }>,
): NonNullable<AuthFormState>["errors"] | undefined {
  if (!details?.length) {
    return undefined;
  }

  const errors: Record<string, string[]> = {};
  for (const detail of details) {
    if (!detail.field || !detail.message) {
      continue;
    }
    errors[detail.field] ??= [];
    errors[detail.field].push(detail.message);
  }

  return Object.keys(errors).length
    ? (errors as NonNullable<AuthFormState>["errors"])
    : undefined;
}

export async function login(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  let response: Response;
  try {
    response = await fetch(`${getAuthApiUrl()}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        identifier: parsed.data.identifier,
        password: parsed.data.password,
      }),
      cache: "no-store",
    });
  } catch {
    return { message: BACKEND_UNAVAILABLE_MESSAGE };
  }

  const body = (await response.json().catch(() => ({}))) as ExpressAuthResponse;

  if (response.status === 403 && body.code === "email-not-verified") {
    return {
      message:
        body.error ||
        "Confirm your email address before signing in. Check your inbox for the verification link.",
      unverifiedEmail: body.email,
    };
  }

  if (!response.ok || !body.accessToken) {
    const errors = mapFieldErrors(body.details);
    return {
      ...(errors ? { errors } : {}),
      message: body.error || "Invalid email, username, or password.",
    };
  }

  await setAccessTokenCookie(body.accessToken, body.expiresIn);
  redirect("/dashboard");
}

export async function register(
  _prevState: AuthFormState,
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

  let response: Response;
  try {
    response = await fetch(`${getAuthApiUrl()}/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        firstName: parsed.data.firstName,
        middleName: parsed.data.middleName || "",
        lastName: parsed.data.lastName,
        username: parsed.data.username,
        dateOfBirth: parsed.data.dateOfBirth,
        email: parsed.data.email,
        password: parsed.data.password,
        confirmPassword: parsed.data.confirmPassword,
      }),
      cache: "no-store",
    });
  } catch {
    return { message: BACKEND_UNAVAILABLE_MESSAGE };
  }

  const body = (await response.json().catch(() => ({}))) as ExpressAuthResponse;

  if (!response.ok) {
    const errors = mapFieldErrors(body.details);
    return {
      ...(errors ? { errors } : {}),
      message: errors
        ? undefined
        : body.error || "Could not create your account. Please try again.",
    };
  }

  // The account exists but is unverified: no session is issued until the
  // user confirms the link we just emailed them.
  return {
    pendingVerification: {
      email: body.email ?? parsed.data.email,
    },
  };
}

export async function resendVerification(
  _prevState: VerificationActionState,
  formData: FormData,
): Promise<VerificationActionState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!EMAIL_PATTERN.test(email)) {
    return { error: "Enter a valid email address." };
  }

  let response: Response;
  try {
    response = await fetch(`${getAuthApiUrl()}/auth/resend-verification`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
      cache: "no-store",
    });
  } catch {
    return { error: BACKEND_UNAVAILABLE_MESSAGE };
  }

  const body = (await response.json().catch(() => ({}))) as ExpressAuthResponse;
  if (!response.ok) {
    return {
      error: body.error || "Could not resend the verification email.",
    };
  }

  return {
    message:
      body.message ||
      "If that account exists and is not confirmed yet, a new verification email has been sent.",
  };
}

export async function verifyEmail(
  token: string,
): Promise<{ ok: boolean; message: string }> {
  if (!VERIFICATION_TOKEN.test(token)) {
    return { ok: false, message: "This verification link is invalid." };
  }

  let response: Response;
  try {
    response = await fetch(`${getAuthApiUrl()}/auth/verify-email`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
      cache: "no-store",
    });
  } catch {
    return { ok: false, message: BACKEND_UNAVAILABLE_MESSAGE };
  }

  const body = (await response.json().catch(() => ({}))) as ExpressAuthResponse;
  if (!response.ok) {
    return {
      ok: false,
      message: body.error || "This verification link is invalid or has expired.",
    };
  }

  return { ok: true, message: body.message || "Email confirmed. You can now sign in." };
}

export async function logout() {
  const token = await getAccessToken();
  if (token) {
    try {
      await fetch(`${getAuthApiUrl()}/auth/logout`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store",
      });
    } catch {
      // Clear local session cookies even if the backend is unreachable.
    }
    await clearAccessTokenCookie();
  }

  await signOut({ redirectTo: "/" });
}
