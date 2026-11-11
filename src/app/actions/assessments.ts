"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/module-action-state";
import { expressRequest, formString } from "@/lib/express-request";

export type { ActionState };

const groomingQuestionKeys = {
  skin: [
    "routineFrequency",
    "moisturizer",
    "cleansing",
    "sunscreen",
    "mainConcern",
  ],
  hair: [
    "washFrequency",
    "stylingProducts",
    "trimFrequency",
    "preferredStyle",
    "mainConcern",
  ],
  beard: [
    "trimFrequency",
    "groomingProducts",
    "shapingFrequency",
    "preferredStyle",
    "mainConcern",
  ],
} as const;

export async function createGroomingAssessment(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const categories = formData
      .getAll("categories")
      .filter((value): value is string => typeof value === "string");
    const answers: Record<string, Record<string, string>> = {};
    for (const category of categories) {
      if (!(category in groomingQuestionKeys)) {
        continue;
      }
      const keys =
        groomingQuestionKeys[category as keyof typeof groomingQuestionKeys];
      const categoryAnswers: Record<string, string> = {};
      for (const key of keys) {
        const value = formString(formData, `${category}.${key}`);
        if (value) {
          categoryAnswers[key] = value;
        }
      }
      answers[category] = categoryAnswers;
    }

    const result = await expressRequest("/assessments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        assessmentType: "manual",
        categories,
        answers,
      }),
    });
    if (!result.assessment) {
      throw new Error("The assessment service returned an incomplete result.");
    }
    revalidatePath("/assessment");
    revalidatePath("/dashboard");
    return {
      message: "Your manual assessment has been saved.",
      assessment: result.assessment,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to save your assessment.",
    };
  }
}

export async function analyzeGroomingAssessment(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const upload = new FormData();
    upload.set("consent", formString(formData, "consent"));
    let imageCount = 0;
    for (const category of ["skin", "hair", "beard"] as const) {
      const image = formData.get(category);
      if (!(image instanceof File) || image.size === 0) {
        continue;
      }
      if (image.size > 5 * 1024 * 1024) {
        return { error: "Each assessment image must be 5 MB or smaller." };
      }
      upload.set(category, image, image.name);
      imageCount += 1;
    }
    if (imageCount === 0) {
      return { error: "Choose at least one image to analyze." };
    }

    const result = await expressRequest("/assessments/analyze", {
      method: "POST",
      body: upload,
    });
    if (!result.assessment) {
      throw new Error("The AI service returned an incomplete assessment.");
    }
    revalidatePath("/assessment");
    revalidatePath("/dashboard");
    return {
      message:
        "Your AI-assisted assessment has been saved. The uploaded images were not stored.",
      assessment: result.assessment,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to analyze your images.",
    };
  }
}

export async function deleteGroomingAssessment(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const assessmentId = formString(formData, "assessmentId");
  try {
    await expressRequest(`/assessments/${encodeURIComponent(assessmentId)}`, {
      method: "DELETE",
    });
    revalidatePath("/assessment");
    return { message: "Assessment deleted." };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to delete assessment.",
    };
  }
}
