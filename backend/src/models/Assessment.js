const mongoose = require("mongoose");

const assessmentResultSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true, maxlength: 80 },
  value: { type: String, required: true, trim: true, maxlength: 500 }
}, { _id: false });

const assessmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  type: {
    type: String,
    enum: ["skin", "hair", "grooming", "general"],
    required: true
  },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  summary: { type: String, trim: true, maxlength: 3000, default: "" },
  score: { type: Number, min: 0, max: 100, default: null },
  results: { type: [assessmentResultSchema], default: [] },
  recommendedRoutine: { type: String, trim: true, maxlength: 6000, default: "" },
  assessedAt: { type: Date, required: true, default: Date.now }
}, { timestamps: true });

assessmentSchema.index({ userId: 1, assessedAt: -1 });

module.exports = mongoose.model("Assessment", assessmentSchema);
