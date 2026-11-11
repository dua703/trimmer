import { getAuthApiUrl } from "@/lib/auth-api";
import { getAccessToken } from "@/lib/auth-session";

type ApiError = {
  error?: string;
  details?: Array<{ field: string; message: string }>;
};

type ApiSuccess = {
  accessToken?: string;
  expiresIn?: number;
  message?: string;
  recoveryKeys?: string[];
  user?: Record<string, unknown>;
  assessment?: {
    assessmentType?: "manual" | "ai";
    summary: string;
    results: Array<{ category: string; question: string; answer: string }>;
    predictions?: Array<{
      category: "skin" | "hair" | "beard";
      modelId: string;
      modelRevision: string;
      predictions: Array<{ label: string; score: number; detected: boolean }>;
    }>;
    recommendations: string[];
  };
};

export function formString(formData: FormData, key: string, trim = true) {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return "";
  }
  return trim ? value.trim() : value;
}

export async function expressRequest(path: string, init: RequestInit = {}) {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Your session has expired. Sign in again.");
  }
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${token}`);
  const response = await fetch(`${getAuthApiUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
  const body = (await response.json().catch(() => ({}))) as ApiSuccess & ApiError;
  if (!response.ok) {
    const details = body.details?.map((detail) => detail.message).join(" ");
    throw new Error(
      details || body.error || "The request could not be completed.",
    );
  }
  return body;
}
