const mongoose = require("mongoose");

const groomingAssessmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  assessmentType: { type: String, enum: ["manual", "ai"], required: true, default: "manual" },
  categories: {
    type: [{ type: String, enum: ["skin", "hair", "beard"] }],
    required: true
  },
  answers: { type: mongoose.Schema.Types.Mixed, required: true },
  results: [{
    category: { type: String, enum: ["skin", "hair", "beard"], required: true },
    question: { type: String, required: true, maxlength: 100 },
    answer: { type: String, required: true, maxlength: 160 }
  }],
  predictions: [{
    category: { type: String, enum: ["skin", "hair", "beard"], required: true },
    modelId: { type: String, required: true, maxlength: 120 },
    modelRevision: { type: String, required: true, match: /^[a-f\d]{40}$/i },
    predictions: [{
      label: { type: String, required: true, maxlength: 80 },
      score: { type: Number, required: true, min: 0, max: 1 },
      detected: { type: Boolean, required: true }
    }]
  }],
  recommendations: [{ type: String, maxlength: 500 }],
  summary: { type: String, required: true, maxlength: 500 }
}, { timestamps: true, strict: true });

groomingAssessmentSchema.index({ userId: 1, createdAt: -1 });
groomingAssessmentSchema.index({ userId: 1, categories: 1, createdAt: -1 });

module.exports = mongoose.model("GroomingAssessment", groomingAssessmentSchema);
