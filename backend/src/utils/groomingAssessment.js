const { z } = require("zod");

const choice = (values) => z.enum(values).optional();
const categoryAnswers = {
  skin: z.object({
    routineFrequency: choice(["daily", "weekly", "rarely", "never"]),
    moisturizer: choice(["daily", "sometimes", "never"]),
    cleansing: choice(["twice_daily", "daily", "occasionally", "rarely"]),
    sunscreen: choice(["daily", "sometimes", "never"]),
    mainConcern: choice(["routine", "hydration", "texture", "blemishes", "redness", "spots", "other"])
  }).strict(),
  hair: z.object({
    washFrequency: choice(["daily", "two_to_three_weekly", "weekly", "less_weekly"]),
    stylingProducts: choice(["often", "sometimes", "rarely", "never"]),
    trimFrequency: choice(["monthly", "every_two_to_three_months", "rarely"]),
    preferredStyle: z.string().trim().max(80).optional(),
    mainConcern: choice(["maintenance", "dryness", "frizz", "styling", "other"])
  }).strict(),
  beard: z.object({
    trimFrequency: choice(["weekly", "every_two_to_three_weeks", "monthly", "rarely"]),
    groomingProducts: choice(["regularly", "sometimes", "never"]),
    shapingFrequency: choice(["weekly", "monthly", "rarely"]),
    preferredStyle: z.string().trim().max(80).optional(),
    mainConcern: choice(["maintenance", "neatness", "dryness", "length", "other"])
  }).strict()
};

const groomingAssessmentSchema = z.object({
  assessmentType: z.literal("manual"),
  categories: z.array(z.enum(["skin", "hair", "beard"])).min(1).max(3),
  answers: z.object({
    skin: categoryAnswers.skin.optional(),
    hair: categoryAnswers.hair.optional(),
    beard: categoryAnswers.beard.optional()
  }).strict()
}).strict().superRefine((input, context) => {
  if (new Set(input.categories).size !== input.categories.length) {
    context.addIssue({ code: "custom", path: ["categories"], message: "Choose each category only once." });
  }
  for (const category of input.categories) {
    const answers = input.answers[category];
    if (!answers || Object.values(answers).every((value) => value === undefined || value === "")) {
      context.addIssue({
        code: "custom",
        path: ["answers", category],
        message: "Answer at least one optional question for each selected category."
      });
    }
  }
});

const questionLabels = {
  skin: {
    routineFrequency: "Skincare routine frequency",
    moisturizer: "Moisturizer use",
    cleansing: "Face cleansing frequency",
    sunscreen: "Sunscreen use",
    mainConcern: "Main skin-care concern"
  },
  hair: {
    washFrequency: "Hair washing frequency",
    stylingProducts: "Styling product use",
    trimFrequency: "Hair trim frequency",
    preferredStyle: "Preferred hairstyle",
    mainConcern: "Main hair grooming concern"
  },
  beard: {
    trimFrequency: "Beard trimming frequency",
    groomingProducts: "Beard product use",
    shapingFrequency: "Beard shaping frequency",
    preferredStyle: "Preferred beard style",
    mainConcern: "Main beard grooming concern"
  }
};

const answerLabels = {
  daily: "Daily",
  weekly: "Weekly",
  rarely: "Rarely",
  never: "Never",
  sometimes: "Sometimes",
  twice_daily: "Twice a day",
  occasionally: "Occasionally",
  two_to_three_weekly: "Two to three times a week",
  less_weekly: "Less than weekly",
  often: "Often",
  monthly: "Monthly",
  every_two_to_three_months: "Every two to three months",
  every_two_to_three_weeks: "Every two to three weeks",
  regularly: "Regularly",
  routine: "Routine consistency",
  hydration: "Hydration",
  texture: "Texture appearance",
  blemishes: "Visible blemishes",
  redness: "Visible redness",
  spots: "Visible spots",
  maintenance: "Maintenance",
  dryness: "Dryness",
  frizz: "Frizz",
  styling: "Styling",
  neatness: "Neatness",
  length: "Length",
  other: "Other"
};

function answerLabel(value) {
  return answerLabels[value] || value;
}

function createManualReport(input) {
  const results = [];
  const recommendations = [];
  const categoryNames = { skin: "Skin", hair: "Hair", beard: "Beard" };

  for (const category of input.categories) {
    const answers = input.answers[category];
    for (const [key, value] of Object.entries(answers)) {
      if (value) {
        results.push({
          category,
          question: questionLabels[category][key],
          answer: answerLabel(value)
        });
      }
    }

    if (category === "skin") {
      if (answers.routineFrequency && answers.routineFrequency !== "daily") {
        recommendations.push("Your answers suggest you may prefer a more consistent, simple skincare routine.");
      }
      if (answers.moisturizer === "never") {
        recommendations.push("If it suits your preferences, consider adding a gentle moisturizer to your routine.");
      }
      if (answers.cleansing === "rarely") {
        recommendations.push("Consider a gentle cleansing routine that fits your day; avoid harsh scrubbing.");
      }
      if (answers.sunscreen === "never" || answers.sunscreen === "sometimes") {
        recommendations.push("When outdoors, consider broad-spectrum sunscreen and follow its product directions.");
      }
    } else if (category === "hair") {
      if (answers.trimFrequency === "rarely") {
        recommendations.push("A regular trim schedule may help you maintain your preferred hairstyle.");
      }
      if (answers.stylingProducts === "often") {
        recommendations.push("Use styling products as directed and wash them out as appropriate for your routine.");
      }
      if (answers.mainConcern === "frizz" || answers.mainConcern === "dryness") {
        recommendations.push("Choose a gentle hair-care routine and products that match your stated preferences.");
      }
    } else {
      if (answers.trimFrequency === "rarely" || answers.shapingFrequency === "rarely") {
        recommendations.push("A regular trim or shaping schedule can help maintain the beard style you prefer.");
      }
      if (answers.groomingProducts === "never") {
        recommendations.push("If desired, explore a simple beard-care product suited to your grooming preferences.");
      }
      if (answers.mainConcern === "neatness") {
        recommendations.push("Regularly check your preferred neckline and cheek-line shape as part of your routine.");
      }
    }

    if (answers.mainConcern === "other") {
      recommendations.push("Use your stated grooming preferences to choose a routine; this questionnaire does not assess medical concerns.");
    }
  }

  const distinctRecommendations = [...new Set(recommendations)];
  if (distinctRecommendations.length === 0) {
    distinctRecommendations.push("Your answers do not suggest a specific routine change; continue with the habits that work for you.");
  }
  return {
    results,
    recommendations: distinctRecommendations,
    summary: `Manual, self-reported assessment for ${input.categories.map((category) => categoryNames[category]).join(", ")}. No image analysis or medical diagnosis was performed.`
  };
}

module.exports = { createManualReport, groomingAssessmentSchema };
