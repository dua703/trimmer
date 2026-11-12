"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/module-action-state";
import { expressRequest, formString } from "@/lib/express-request";

export type { ActionState };

export async function updateProfile(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const response = await expressRequest("/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        firstName: formString(formData, "firstName"),
        middleName: formString(formData, "middleName"),
        lastName: formString(formData, "lastName"),
        email: formString(formData, "email"),
        dateOfBirth: formString(formData, "dateOfBirth") || null,
        gender: formString(formData, "gender"),
        groomingProfile: {
          skinType: formString(formData, "skinType"),
          hairType: formString(formData, "hairType"),
          hairConcerns: formString(formData, "hairConcerns"),
          beardStyle: formString(formData, "beardStyle"),
          groomingPreferences: formString(formData, "groomingPreferences"),
          skinCareGoals: formString(formData, "skinCareGoals"),
          hairCareGoals: formString(formData, "hairCareGoals"),
          sensitivities: formString(formData, "sensitivities"),
        },
        preferences: {
          routineFrequency: formString(formData, "routineFrequency"),
          budgetAmount: formString(formData, "budgetAmount") || "0",
          budgetCurrency: formString(formData, "budgetCurrency"),
          language: formString(formData, "language"),
          notifications: {
            email: formData.get("notifyEmail") === "on",
            assessmentReminders: formData.get("assessmentReminders") === "on",
          },
        },
      }),
    });
    revalidatePath("/dashboard");
    return { message: "Profile saved.", profile: response.profile };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Unable to update your profile.",
    };
  }
}

export async function uploadProfilePicture(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const picture = formData.get("picture");
    if (!(picture instanceof File) || picture.size === 0) {
      return { error: "Choose a JPEG, PNG, or WebP image." };
    }
    if (picture.size > 5 * 1024 * 1024) {
      return { error: "Profile picture must be 5 MB or smaller." };
    }
    const upload = new FormData();
    upload.set("picture", picture);
    await expressRequest("/profile/picture", { method: "POST", body: upload });
    revalidatePath("/dashboard");
    return { message: "Profile picture updated." };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to upload profile picture.",
    };
  }
}

export async function removeProfilePicture(
  _state: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  try {
    await expressRequest("/profile/picture", { method: "DELETE" });
    revalidatePath("/dashboard");
    return { message: "Profile picture removed." };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to remove profile picture.",
    };
  }
}

export async function saveAssessment(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const rawResults = formString(formData, "results");
    let results: unknown[] = [];
    if (rawResults) {
      const parsed: unknown = JSON.parse(rawResults);
      if (!Array.isArray(parsed)) {
        throw new Error("Assessment results must be a JSON array.");
      }
      results = parsed;
    }
    const localDate = formString(formData, "assessedAt");
    const assessedAt = localDate ? new Date(localDate).toISOString() : undefined;
    await expressRequest("/profile/assessments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: formString(formData, "type"),
        title: formString(formData, "title"),
        summary: formString(formData, "summary"),
        score: formString(formData, "score") || null,
        results,
        recommendedRoutine: formString(formData, "recommendedRoutine"),
        assessedAt,
      }),
    });
    revalidatePath("/dashboard");
    return { message: "Assessment saved to your history." };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Unable to save assessment.",
    };
  }
}

export async function deleteAssessment(formData: FormData) {
  const assessmentId = formString(formData, "assessmentId");
  try {
    await expressRequest(
      `/profile/assessments/${encodeURIComponent(assessmentId)}`,
      { method: "DELETE" },
    );
    revalidatePath("/dashboard");
  } catch (error) {
    console.error("Failed to delete assessment:", error);
    throw error;
  }
}
