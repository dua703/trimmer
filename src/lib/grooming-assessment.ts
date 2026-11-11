import { getAuthApiUrl } from "@/lib/auth-api";
import { getAccessToken } from "@/lib/auth-session";

export type GroomingAssessmentRecord = {
  id: string;
  assessmentType: "manual" | "ai";
  categories: Array<"skin" | "hair" | "beard">;
  answers: Record<string, Record<string, string>>;
  results: Array<{ category: string; question: string; answer: string }>;
  predictions?: GroomingAssessmentPrediction[];
  recommendations: string[];
  summary: string;
  createdAt: string;
};

export type GroomingAssessmentPrediction = {
  category: "skin" | "hair" | "beard";
  modelId: string;
  modelRevision: string;
  predictions: Array<{ label: string; score: number; detected: boolean }>;
};

export type GroomingAssessmentStatistics = {
  total: number;
  byCategory: Record<"skin" | "hair" | "beard", number>;
};

async function authenticatedRequest(path: string) {
  const token = await getAccessToken();
  if (!token) {
    return null;
  }
  const response = await fetch(`${getAuthApiUrl()}${path}`, {
    headers: { authorization: ["Bearer", token].join(" ") },
    cache: "no-store",
  });
  if (response.status === 401) {
    return null;
  }
  if (!response.ok) {
    throw new Error("Grooming assessments are temporarily unavailable.");
  }
  return response;
}

export async function getGroomingAssessments() {
  const response = await authenticatedRequest("/assessments?limit=100");
  if (!response) {
    return null;
  }
  const body = (await response.json()) as {
    assessments: GroomingAssessmentRecord[];
  };
  return body.assessments;
}

export async function getGroomingAssessmentStatistics() {
  const response = await authenticatedRequest("/assessments/statistics");
  if (!response) {
    return null;
  }
  const body = (await response.json()) as {
    statistics: GroomingAssessmentStatistics;
  };
  return body.statistics;
}
