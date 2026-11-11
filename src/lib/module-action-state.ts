export type ActionState = {
  error?: string;
  message?: string;
  recoveryKeys?: string[];
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
} | undefined;
