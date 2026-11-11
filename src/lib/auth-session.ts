import { cookies } from "next/headers";
import {
  ACCESS_TOKEN_COOKIE,
  getAuthApiUrl,
  type ExpressPublicUser,
} from "@/lib/auth-api";

export async function getAccessToken() {
  return (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
}

export async function setAccessTokenCookie(
  accessToken: string,
  expiresIn?: number,
) {
  const cookieStore = await cookies();
  cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: expiresIn || 7 * 24 * 60 * 60,
  });
}

export async function clearAccessTokenCookie() {
  (await cookies()).delete(ACCESS_TOKEN_COOKIE);
}

export async function fetchExpressUser(token: string) {
  const response = await fetch(`${getAuthApiUrl()}/auth/me`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const body = (await response.json().catch(() => ({}))) as {
    user?: ExpressPublicUser;
    error?: string;
  };
  if (!response.ok || !body.user) {
    return null;
  }
  return body.user;
}
