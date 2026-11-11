import { getAuthApiUrl } from "@/lib/auth-api";
import { getAccessToken } from "@/lib/auth-session";

export type Profile = {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  username: string;
  email: string;
  dateOfBirth?: string | null;
  gender: string;
  profilePicture: string | null;
  authProvider: string;
  groomingProfile: {
    skinType: string;
    hairType: string;
    hairConcerns: string;
    beardStyle: string;
    groomingPreferences: string;
    skinCareGoals: string;
    hairCareGoals: string;
    sensitivities: string;
  };
  preferences: {
    routineFrequency: string;
    budgetAmount: number;
    budgetCurrency: string;
    language: string;
    notifications: {
      email: boolean;
      assessmentReminders: boolean;
    };
  };
};

export type Assessment = {
  id: string;
  type: "skin" | "hair" | "grooming" | "general";
  title: string;
  summary: string;
  score: number | null;
  results: Array<{ label: string; value: string }>;
  recommendedRoutine: string;
  assessedAt: string;
};

export async function getProfile() {
  const token = await getAccessToken();
  if (!token) {
    return null;
  }
  const response = await fetch(`${getAuthApiUrl()}/profile`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (response.status === 401) {
    return null;
  }
  if (!response.ok) {
    throw new Error("The profile service is temporarily unavailable.");
  }
  return (await response.json()) as { profile: Profile };
}

export async function getAssessments() {
  const token = await getAccessToken();
  if (!token) {
    return [];
  }
  const response = await fetch(`${getAuthApiUrl()}/profile/assessments`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (response.status === 401) {
    return [];
  }
  if (!response.ok) {
    throw new Error("Assessment history is temporarily unavailable.");
  }
  const body = (await response.json()) as { assessments: Assessment[] };
  return body.assessments;
}
