const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createManualReport,
  groomingAssessmentSchema
} = require("../src/utils/groomingAssessment");

test("manual assessment accepts partial answers and requires one answer per selected category", () => {
  const valid = groomingAssessmentSchema.safeParse({
    assessmentType: "manual",
    categories: ["skin", "hair"],
    answers: {
      skin: { moisturizer: "never" },
      hair: { preferredStyle: "Wavy bob" }
    }
  });
  assert.equal(valid.success, true);

  const missingCategoryAnswers = groomingAssessmentSchema.safeParse({
    assessmentType: "manual",
    categories: ["skin", "beard"],
    answers: { skin: { moisturizer: "sometimes" } }
  });
  assert.equal(missingCategoryAnswers.success, false);
});

test("manual assessment rejects duplicate categories and invalid answer values", () => {
  const duplicate = groomingAssessmentSchema.safeParse({
    assessmentType: "manual",
    categories: ["hair", "hair"],
    answers: { hair: { trimFrequency: "monthly" } }
  });
  assert.equal(duplicate.success, false);

  const invalidAnswer = groomingAssessmentSchema.safeParse({
    assessmentType: "manual",
    categories: ["beard"],
    answers: { beard: { trimFrequency: "daily" } }
  });
  assert.equal(invalidAnswer.success, false);
});

test("grooming assessments reject image and combined assessment types", () => {
  for (const assessmentType of ["image", "combined"]) {
    const result = groomingAssessmentSchema.safeParse({
      assessmentType,
      categories: ["skin"],
      answers: { skin: { moisturizer: "sometimes" } }
    });
    assert.equal(result.success, false);
  }
});

test("manual report preserves self-reported answers and provides relevant routine suggestions", () => {
  const parsed = groomingAssessmentSchema.parse({
    assessmentType: "manual",
    categories: ["skin", "beard"],
    answers: {
      skin: { sunscreen: "never" },
      beard: { trimFrequency: "rarely", mainConcern: "neatness" }
    }
  });
  const report = createManualReport(parsed);

  assert.match(report.summary, /self-reported/);
  assert.equal(report.results.length, 3);
  assert.ok(report.recommendations.some((item) => item.includes("sunscreen")));
  assert.ok(report.recommendations.some((item) => item.includes("trim or shaping")));
  assert.ok(report.recommendations.some((item) => item.includes("neckline")));
  assert.match(report.summary, /No image analysis or medical diagnosis was performed/);
});
