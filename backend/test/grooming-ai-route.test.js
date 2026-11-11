process.env.NODE_ENV = "test";
process.env.MONGODB_URI ||= "mongodb://127.0.0.1:27017/trimmer_auth_test";
process.env.JWT_SECRET ||= "test-jwt-secret-with-more-than-thirty-two-characters";
process.env.OAUTH_STATE_SECRET ||= "test-oauth-secret-with-more-than-thirty-two-characters";
process.env.RECOVERY_KEY_SECRET ||= "test-recovery-secret-with-more-than-thirty-two-characters";
process.env.AI_SERVICE_URL = "http://127.0.0.1:8000";

const test = require("node:test");
const assert = require("node:assert/strict");
const { deflateSync } = require("node:zlib");
const app = require("../src/app");
const Session = require("../src/models/Session");
const GroomingAssessment = require("../src/models/GroomingAssessment");
const { createAccessToken } = require("../src/utils/auth");

const userId = "65c000000000000000000001";
const sessionId = "65c000000000000000000002";

function crc32(data) {
  let checksum = 0xffffffff;
  for (const byte of data) {
    checksum ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      checksum = checksum & 1 ? (checksum >>> 1) ^ 0xedb88320 : checksum >>> 1;
    }
  }
  return (checksum ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function tinyPng() {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(1, 0);
  header.writeUInt32BE(1, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(Buffer.from([0, 100, 120, 140]))),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

test("authenticated AI image uploads save predictions, never the source image", async () => {
  const originalFindOne = Session.findOne;
  const originalCreate = GroomingAssessment.create;
  const originalFetch = global.fetch;
  const savedAssessments = [];
  let predictionRequests = 0;
  const modelResult = {
    category: "skin",
    modelId: "charuka0/acne-multilabel-classifier",
    modelRevision: "37b19c063c70834381451a950681f9078461a2e0",
    predictions: [{ label: "Papule", score: 0.81, detected: true }]
  };

  Session.findOne = async (query) => ({ _id: query._id, userId: query.userId });
  GroomingAssessment.create = async (assessment) => {
    savedAssessments.push(assessment);
    return {
      ...assessment,
      id: "65c000000000000000000003",
      createdAt: new Date("2026-11-08T10:00:00.000Z")
    };
  };
  global.fetch = async (input, options) => {
    if (String(input) === "http://127.0.0.1:8000/predict") {
      predictionRequests += 1;
      assert.equal(options.body.get("category"), "skin");
      assert.equal(options.body.get("image").type, "image/png");
      return new Response(JSON.stringify(modelResult), { status: 200 });
    }
    return originalFetch(input, options);
  };

  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}/assessments/analyze`;
    const authorization = `Bearer ${createAccessToken(userId, sessionId)}`;

    const noConsent = await originalFetch(url, {
      method: "POST",
      headers: { authorization },
      body: new FormData()
    });
    assert.equal(noConsent.status, 400);
    assert.equal(predictionRequests, 0);

    const form = new FormData();
    form.set("consent", "true");
    form.set("skin", new Blob([tinyPng()], { type: "image/png" }), "skin.png");
    const response = await originalFetch(url, {
      method: "POST",
      headers: { authorization },
      body: form
    });
    const body = await response.json();

    assert.equal(response.status, 201, JSON.stringify(body));
    assert.equal(predictionRequests, 1);
    assert.equal(body.assessment.assessmentType, "ai");
    assert.deepEqual(body.assessment.categories, ["skin"]);
    assert.equal(body.assessment.predictions[0].predictions[0].label, "Papule");
    assert.equal(savedAssessments.length, 1);
    assert.equal(savedAssessments[0].userId, userId);
    assert.equal("image" in savedAssessments[0], false);
    assert.equal("skin" in savedAssessments[0], false);
  } finally {
    Session.findOne = originalFindOne;
    GroomingAssessment.create = originalCreate;
    global.fetch = originalFetch;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
