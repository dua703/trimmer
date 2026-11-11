const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const { z } = require("zod");
const fileType = import("file-type");
const GroomingAssessment = require("../models/GroomingAssessment");
const { authenticate } = require("../middleware/authenticate");
const { createManualReport, groomingAssessmentSchema } = require("../utils/groomingAssessment");
const { analyzeImage } = require("../services/groomingAi");
const { createAiReport } = require("../utils/aiGroomingAssessment");

const router = express.Router();
const categories = ["skin", "hair", "beard"];
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const aiImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 3, fields: 1, parts: 4 },
  fileFilter: (_req, file, callback) => {
    if (!allowedImageTypes.has(file.mimetype)) {
      const error = new Error("Upload a JPEG, PNG, or WebP image.");
      error.status = 400;
      return callback(error);
    }
    return callback(null, true);
  }
}).fields(categories.map((category) => ({ name: category, maxCount: 1 })));

function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    const error = new Error("Invalid assessment request.");
    error.status = 400;
    error.details = result.error.issues.map(({ path, message }) => ({
      field: path.join("."),
      message
    }));
    throw error;
  }
  return result.data;
}

function assessmentView(assessment) {
  return {
    id: assessment.id,
    assessmentType: assessment.assessmentType,
    categories: assessment.categories,
    answers: assessment.answers,
    results: assessment.results,
    predictions: assessment.predictions || [],
    recommendations: assessment.recommendations,
    summary: assessment.summary,
    createdAt: assessment.createdAt
  };
}

router.use(authenticate);

router.get("/statistics", async (req, res, next) => {
  try {
    const [total, grouped] = await Promise.all([
      GroomingAssessment.countDocuments({ userId: req.auth.userId }),
      GroomingAssessment.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(req.auth.userId),
            assessmentType: { $in: ["manual", "ai"] }
          }
        },
        { $unwind: "$categories" },
        { $group: { _id: "$categories", count: { $sum: 1 } } }
      ])
    ]);
    const byCategory = Object.fromEntries(categories.map((category) => [category, 0]));
    for (const item of grouped) byCategory[item._id] = item.count;
    return res.json({ statistics: { total, byCategory } });
  } catch (error) {
    return next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const querySchema = z.object({
      category: z.enum(categories).optional(),
      search: z.string().trim().max(80).optional(),
      limit: z.coerce.number().int().min(1).max(100).default(50)
    }).strict();
    const query = parse(querySchema, req.query);
    const filter = { userId: req.auth.userId };
    if (query.category) filter.categories = query.category;
    if (query.search) {
      const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { summary: { $regex: escaped, $options: "i" } },
        { recommendations: { $regex: escaped, $options: "i" } },
        { "results.question": { $regex: escaped, $options: "i" } },
        { "results.answer": { $regex: escaped, $options: "i" } },
        { "predictions.predictions.label": { $regex: escaped, $options: "i" } }
      ];
    }
    const assessments = await GroomingAssessment.find(filter)
      .sort({ createdAt: -1 })
      .limit(query.limit);
    return res.json({ assessments: assessments.map(assessmentView) });
  } catch (error) {
    return next(error);
  }
});

router.post("/analyze", (req, res, next) => {
  aiImageUpload(req, res, (error) => {
    if (error?.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "Each image must be 5 MB or smaller." });
    }
    if (error?.code === "LIMIT_FILE_COUNT" || error?.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({ error: "Upload one image for each selected category." });
    }
    if (error) return next(error);
    return next();
  });
}, async (req, res, next) => {
  try {
    const consent = z.literal("true").safeParse(req.body?.consent);
    if (!consent.success) {
      return res.status(400).json({ error: "Confirm that you consent to temporary image analysis." });
    }
    const files = req.files || {};
    const selected = categories.filter((category) => files[category]?.[0]);
    if (selected.length === 0) {
      return res.status(400).json({ error: "Choose at least one image to analyze." });
    }

    const { fileTypeFromBuffer } = await fileType;
    const predictions = [];
    for (const category of selected) {
      const file = files[category][0];
      const detectedType = await fileTypeFromBuffer(file.buffer);
      if (!detectedType || !allowedImageTypes.has(detectedType.mime)) {
        return res.status(400).json({
          error: `The ${category} upload is not a valid JPEG, PNG, or WebP image.`
        });
      }
      predictions.push(await analyzeImage(category, file, detectedType.mime));
    }

    const report = createAiReport(predictions);
    const assessment = await GroomingAssessment.create({
      userId: req.auth.userId,
      ...report
    });
    return res.status(201).json({ assessment: assessmentView(assessment) });
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const input = parse(groomingAssessmentSchema, req.body);
    const report = createManualReport(input);
    const assessment = await GroomingAssessment.create({
      userId: req.auth.userId,
      ...input,
      ...report
    });
    return res.status(201).json({ assessment: assessmentView(assessment) });
  } catch (error) {
    return next(error);
  }
});

router.get("/:assessmentId", async (req, res, next) => {
  try {
    const id = parse(z.string().regex(/^[a-f\d]{24}$/i), req.params.assessmentId);
    const assessment = await GroomingAssessment.findOne({
      _id: id,
      userId: req.auth.userId
    });
    if (!assessment) return res.status(404).json({ error: "Assessment not found." });
    return res.json({ assessment: assessmentView(assessment) });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:assessmentId", async (req, res, next) => {
  try {
    const id = parse(z.string().regex(/^[a-f\d]{24}$/i), req.params.assessmentId);
    const assessment = await GroomingAssessment.findOneAndDelete({
      _id: id,
      userId: req.auth.userId
    });
    if (!assessment) return res.status(404).json({ error: "Assessment not found." });
    return res.json({ message: "Assessment deleted." });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
