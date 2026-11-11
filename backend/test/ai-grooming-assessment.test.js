process.env.NODE_ENV = "test";
process.env.MONGODB_URI ||= "mongodb://127.0.0.1:27017/trimmer_auth_test";
process.env.JWT_SECRET ||= "test-jwt-secret-with-more-than-thirty-two-characters";
process.env.OAUTH_STATE_SECRET ||= "test-oauth-secret-with-more-than-thirty-two-characters";
process.env.RECOVERY_KEY_SECRET ||= "test-recovery-secret-with-more-than-thirty-two-characters";

const test = require("node:test");
const assert = require("node:assert/strict");
const GroomingAssessment = require("../src/models/GroomingAssessment");
const { analyzeImage, aiResultSchema } = require("../src/services/groomingAi");
const { createAiReport } = require("../src/utils/aiGroomingAssessment");

const revision = "37b19c063c70834381451a950681f9078461a2e0";

test("AI model responses require bounded confidence scores and pinned revisions", () => {
  const valid = {
    category: "skin",
    modelId: "charuka0/acne-multilabel-classifier",
    modelRevision: revision,
    predictions: [{ label: "Whitehead", score: 0.9, detected: false }]
  };
  assert.equal(aiResultSchema.safeParse(valid).success, true);
  assert.equal(aiResultSchema.safeParse({
    ...valid,
    predictions: [{ label: "Whitehead", score: 1.1, detected: true }]
  }).success, false);
  assert.equal(aiResultSchema.safeParse({ ...valid, modelRevision: "main" }).success, false);
});

test("AI service client forwards images and validates the returned category", async () => {
  const originalFetch = global.fetch;
  const result = {
    category: "hair",
    modelId: "dima806/hair_type_image_detection",
    modelRevision: "c918d5859f6830e667edd0aa4260703ea11a8d10",
    predictions: [{ label: "wavy", score: 0.82, detected: true }]
  };
  let requestUrl;
  global.fetch = async (url, options) => {
    requestUrl = url;
    assert.equal(options.method, "POST");
    assert.equal(options.body.get("category"), "hair");
    assert.equal(options.body.get("image").type, "image/png");
    return new Response(JSON.stringify(result), { status: 200 });
  };
  try {
    const prediction = await analyzeImage("hair", {
      buffer: Buffer.from("image bytes"),
      originalname: "hair.png"
    }, "image/png");
    assert.match(requestUrl, /\/predict$/);
    assert.equal(prediction.category, "hair");
  } finally {
    global.fetch = originalFetch;
  }
});

test("AI service failures are surfaced with a retryable service error", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => { throw new Error("connection refused"); };
  try {
    await assert.rejects(
      analyzeImage("skin", { buffer: Buffer.from("image bytes"), originalname: "skin.png" }, "image/png"),
      (error) => error.status === 503 && /Python AI service/.test(error.message)
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test("AI report records model estimates without diagnosing or retaining images", () => {
  const report = createAiReport([
    {
      category: "skin",
      modelId: "charuka0/acne-multilabel-classifier",
      modelRevision: revision,
      predictions: [
        { label: "Whitehead", score: 0.91, detected: false },
        { label: "Papule", score: 0.76, detected: true }
      ]
    },
    {
      category: "hair",
      modelId: "dima806/hair_type_image_detection",
      modelRevision: "c918d5859f6830e667edd0aa4260703ea11a8d10",
      predictions: [{ label: "wavy", score: 0.82, detected: true }]
    }
  ]);

  assert.equal(report.assessmentType, "ai");
  assert.deepEqual(report.categories, ["skin", "hair"]);
  assert.equal(report.answers.constructor, Object);
  assert.match(report.summary, /images were processed temporarily and are not saved/);
  assert.match(report.summary, /not a medical diagnosis/i);
  assert.match(report.results[0].answer, /Papule/);
  assert.match(report.results[1].answer, /82%/);
  assert.equal("image" in report, false);
});

test("AI predictions pass the grooming history schema", () => {
  const assessment = new GroomingAssessment({
    userId: "65c000000000000000000001",
    ...createAiReport([{
      category: "beard",
      modelId: "dima806/beard_face_image_detection",
      modelRevision: "f13217aeacd0a42fee035b903681cbf7fdf1e1e7",
      predictions: [{ label: "Beard", score: 0.99, detected: true }]
    }])
  });

  assert.equal(assessment.validateSync(), undefined);
  assert.equal(assessment.assessmentType, "ai");
});
