"use server";

import { redirect } from "next/navigation";
import { getAuthApiUrl } from "@/lib/auth-api";
import {
  clearAccessTokenCookie,
  getAccessToken,
  setAccessTokenCookie,
} from "@/lib/auth-session";
import { isRedirectError } from "@/lib/backend";

const HANDOFF_CODE = /^[A-Za-z0-9_-]{43}$/;

type GoogleExchangeResponse = {
  accessToken?: string;
  tokenType?: string;
  expiresIn?: number;
  recoveryKeys?: string[];
  error?: string;
};

export type GoogleHandoffResult = {
  error?: string;
  recoveryKeys?: string[];
};

export async function completeGoogleHandoff(
  code: string,
): Promise<GoogleHandoffResult> {
  if (!HANDOFF_CODE.test(code)) {
    return {
      error: "Google sign-in link is invalid. Please try again.",
    };
  }

  let response: Response;
  try {
    response = await fetch(`${getAuthApiUrl()}/auth/google/exchange`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
      cache: "no-store",
    });
  } catch {
    return {
      error: "Authentication service is unavailable. Please try again.",
    };
  }

  const result = (await response.json().catch(() => ({}))) as GoogleExchangeResponse;

  if (!response.ok || !result.accessToken) {
    return {
      error:
        result.error ||
        "Google sign-in could not be completed. Please try again.",
    };
  }

  await setAccessTokenCookie(result.accessToken, result.expiresIn);

  redirect("/dashboard");
}

export async function logoutExpressSession() {
  const token = await getAccessToken();
  if (token) {
    try {
      const response = await fetch(`${getAuthApiUrl()}/auth/logout`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok && response.status !== 401) {
        throw new Error(
          "Could not revoke the session. Please try signing out again.",
        );
      }
    } catch (error) {
      if (isRedirectError(error)) {
        throw error;
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(
        "Could not revoke the session. Please try signing out again.",
      );
    }
  }

  await clearAccessTokenCookie();
  redirect("/");
}
