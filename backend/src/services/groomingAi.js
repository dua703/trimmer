const { z } = require("zod");
const { env } = require("../config/env");

const predictionSchema = z.object({
  label: z.string().trim().min(1).max(80),
  score: z.number().finite().min(0).max(1),
  detected: z.boolean()
}).strict();

const aiResultSchema = z.object({
  category: z.enum(["skin", "hair", "beard"]),
  modelId: z.string().trim().min(1).max(120),
  modelRevision: z.string().regex(/^[a-f\d]{40}$/i),
  predictions: z.array(predictionSchema).min(1).max(10)
}).strict();

function serviceError(message, status = 503) {
  const error = new Error(message);
  error.status = status;
  error.expose = status >= 500;
  return error;
}

async function analyzeImage(category, file, mimeType) {
  const form = new FormData();
  form.set("category", category);
  form.set("image", new Blob([file.buffer], { type: mimeType }), file.originalname);
  const headers = {};
  if (env.AI_SERVICE_API_KEY) {
    headers.authorization = `Bearer ${env.AI_SERVICE_API_KEY}`;
  }

  let response;
  try {
    response = await fetch(`${env.AI_SERVICE_URL.replace(/\/+$/, "")}/predict`, {
      method: "POST",
      headers,
      body: form,
      signal: AbortSignal.timeout(10 * 60 * 1000)
    });
  } catch (error) {
    throw serviceError(
      "The AI assessment service is unavailable. Start the Python AI service and try again."
    );
  }

  let body;
  try {
    body = await response.json();
  } catch (error) {
    throw serviceError("The AI assessment service returned an invalid response.");
  }

  if (!response.ok) {
    if (response.status === 400 || response.status === 413) {
      const error = new Error(typeof body.detail === "string" ? body.detail : "The image was rejected.");
      error.status = response.status;
      error.expose = true;
      throw error;
    }
    throw serviceError(
      "The AI model could not analyze this image. Check the Python AI service and try again."
    );
  }

  const result = aiResultSchema.safeParse(body);
  if (!result.success || result.data.category !== category) {
    throw serviceError("The AI assessment service returned an invalid prediction.");
  }
  return result.data;
}

module.exports = { analyzeImage, aiResultSchema };
