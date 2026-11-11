const { randomBytes } = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const express = require("express");
const multer = require("multer");
const fileType = import("file-type");
const { z } = require("zod");
const Assessment = require("../models/Assessment");
const User = require("../models/User");
const { authenticate } = require("../middleware/authenticate");
const { isValidDateOfBirth, nameSchema, optionalNameSchema } = require("../utils/validation");

const router = express.Router();
const avatarDirectory = path.resolve(__dirname, "../../uploads", "avatars");
const allowedAvatarTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"]
]);
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!allowedAvatarTypes.has(file.mimetype)) {
      const error = new Error("Upload a JPEG, PNG, or WebP image.");
      error.status = 400;
      return callback(error);
    }
    return callback(null, true);
  }
});

const profileSchema = z.object({
  firstName: nameSchema,
  middleName: optionalNameSchema,
  lastName: nameSchema,
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  dateOfBirth: z.string().refine(isValidDateOfBirth, "You must be at least 16 years old.").nullable(),
  gender: z.enum(["", "female", "male", "non-binary", "prefer-not-to-say", "self-described"]).default(""),
  groomingProfile: z.object({
    skinType: z.enum(["oily", "dry", "combination", "normal", "unsure"]),
    hairType: z.enum(["straight", "wavy", "curly", "coily", "unsure"]),
    hairConcerns: z.string().trim().max(1000),
    beardStyle: z.string().trim().max(80),
    groomingPreferences: z.string().trim().max(1500),
    skinCareGoals: z.string().trim().max(1000),
    hairCareGoals: z.string().trim().max(1000),
    sensitivities: z.string().trim().max(1500)
  }),
  preferences: z.object({
    routineFrequency: z.enum(["daily", "weekly"]),
    budgetAmount: z.coerce.number().min(0).max(1000000),
    budgetCurrency: z.enum(["USD", "PKR", "GBP", "EUR"]),
    language: z.enum(["en", "ur"]),
    notifications: z.object({
      email: z.boolean(),
      assessmentReminders: z.boolean()
    })
  })
});

const assessmentSchema = z.object({
  type: z.enum(["skin", "hair", "grooming", "general"]),
  title: z.string().trim().min(1).max(100),
  summary: z.string().trim().max(3000).default(""),
  score: z.preprocess((value) => value === null || value === "" ? null : value,
    z.coerce.number().min(0).max(100).nullable()).optional(),
  results: z.array(z.object({
    label: z.string().trim().min(1).max(80),
    value: z.string().trim().min(1).max(500)
  })).max(30).default([]),
  recommendedRoutine: z.string().trim().max(6000).default(""),
  assessedAt: z.string().datetime().optional()
});

function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    const error = new Error("Invalid request.");
    error.status = 400;
    error.details = result.error.issues.map(({ path: fieldPath, message }) => ({
      field: fieldPath.join("."),
      message
    }));
    throw error;
  }
  return result.data;
}

function profileView(user) {
  return {
    id: user.id,
    firstName: user.firstName,
    middleName: user.middleName,
    lastName: user.lastName,
    username: user.username,
    email: user.email,
    dateOfBirth: user.dateOfBirth,
    gender: user.gender || "",
    profilePicture: user.profilePicture,
    authProvider: user.authProvider,
    emailVerified: Boolean(user.emailVerified),
    groomingProfile: user.groomingProfile,
    preferences: user.preferences,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function assessmentView(assessment) {
  return {
    id: assessment.id,
    type: assessment.type,
    title: assessment.title,
    summary: assessment.summary,
    score: assessment.score,
    results: assessment.results,
    recommendedRoutine: assessment.recommendedRoutine,
    assessedAt: assessment.assessedAt,
    createdAt: assessment.createdAt
  };
}

router.use(authenticate);

router.get("/", async (req, res, next) => {
  try {
    const user = await User.findById(req.auth.userId);
    if (!user) return res.status(404).json({ error: "Profile not found." });
    return res.json({ profile: profileView(user) });
  } catch (error) {
    return next(error);
  }
});

router.get("/picture", async (req, res, next) => {
  try {
    const user = await User.findById(req.auth.userId);
    if (!user?.profilePicture) return res.status(404).json({ error: "Profile picture not found." });
    const filename = path.basename(user.profilePicture);
    const extension = path.extname(filename);
    const contentType = [...allowedAvatarTypes.entries()]
      .find(([, allowedExtension]) => allowedExtension === extension)?.[0];
    if (!contentType || filename !== user.profilePicture.split("/").pop()) {
      return res.status(404).json({ error: "Profile picture not found." });
    }
    const image = await fs.readFile(path.join(avatarDirectory, filename));
    res.set({
      "Content-Type": contentType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff"
    });
    return res.send(image);
  } catch (error) {
    if (error.code === "ENOENT") return res.status(404).json({ error: "Profile picture not found." });
    return next(error);
  }
});

router.patch("/", async (req, res, next) => {
  try {
    const input = parse(profileSchema, req.body);
    const duplicateEmail = await User.exists({
      email: input.email,
      _id: { $ne: req.auth.userId }
    });
    if (duplicateEmail) {
      return res.status(409).json({ error: "Email is already used by another account." });
    }

    const user = await User.findById(req.auth.userId);
    if (!user) return res.status(404).json({ error: "Profile not found." });
    user.firstName = input.firstName;
    user.middleName = input.middleName;
    user.lastName = input.lastName;
    user.email = input.email;
    user.dateOfBirth = input.dateOfBirth ? new Date(`${input.dateOfBirth}T00:00:00.000Z`) : null;
    user.gender = input.gender;
    user.groomingProfile = input.groomingProfile;
    user.preferences = input.preferences;
    await user.save();
    return res.json({ profile: profileView(user) });
  } catch (error) {
    return next(error);
  }
});

router.post("/picture", (req, res, next) => {
  avatarUpload.single("picture")(req, res, (error) => {
    if (error) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "Profile picture must be 5 MB or smaller." });
      }
      return next(error);
    }
    return next();
  });
}, async (req, res, next) => {
  let createdPath;
  try {
    if (!req.file) return res.status(400).json({ error: "Choose a profile picture to upload." });
    const { fileTypeFromBuffer } = await fileType;
    const detected = await fileTypeFromBuffer(req.file.buffer);
    const extension = detected && allowedAvatarTypes.get(detected.mime);
    if (!detected || !extension) {
      return res.status(400).json({ error: "The uploaded file is not a valid JPEG, PNG, or WebP image." });
    }

    const user = await User.findById(req.auth.userId);
    if (!user) return res.status(404).json({ error: "Profile not found." });
    await fs.mkdir(avatarDirectory, { recursive: true });
    const filename = `${randomBytes(24).toString("hex")}${extension}`;
    createdPath = path.join(avatarDirectory, filename);
    await fs.writeFile(createdPath, req.file.buffer, { flag: "wx", mode: 0o600 });

    const previousPicture = user.profilePicture;
    user.profilePicture = `/uploads/avatars/${filename}`;
    await user.save();
    if (previousPicture?.startsWith("/uploads/avatars/")) {
      const oldName = path.basename(previousPicture);
      await fs.rm(path.join(avatarDirectory, oldName), { force: true });
    }
    return res.json({ profile: profileView(user) });
  } catch (error) {
    if (createdPath) await fs.rm(createdPath, { force: true }).catch((cleanupError) => {
      console.error("Failed to remove incomplete avatar upload:", cleanupError);
    });
    return next(error);
  }
});

router.delete("/picture", async (req, res, next) => {
  try {
    const user = await User.findById(req.auth.userId);
    if (!user) return res.status(404).json({ error: "Profile not found." });
    const previousPicture = user.profilePicture;
    user.profilePicture = null;
    await user.save();
    if (previousPicture?.startsWith("/uploads/avatars/")) {
      await fs.rm(path.join(avatarDirectory, path.basename(previousPicture)), { force: true });
    }
    return res.json({ profile: profileView(user) });
  } catch (error) {
    return next(error);
  }
});

router.get("/assessments", async (req, res, next) => {
  try {
    const limit = req.query.limit === undefined
      ? 50
      : parse(z.coerce.number().int().min(1).max(100), req.query.limit);
    const assessments = await Assessment.find({ userId: req.auth.userId })
      .sort({ assessedAt: -1 })
      .limit(limit);
    return res.json({ assessments: assessments.map(assessmentView) });
  } catch (error) {
    return next(error);
  }
});

router.post("/assessments", async (req, res, next) => {
  try {
    const input = parse(assessmentSchema, req.body);
    const assessment = await Assessment.create({
      ...input,
      assessedAt: input.assessedAt ? new Date(input.assessedAt) : new Date(),
      userId: req.auth.userId
    });
    return res.status(201).json({ assessment: assessmentView(assessment) });
  } catch (error) {
    return next(error);
  }
});

router.delete("/assessments/:assessmentId", async (req, res, next) => {
  try {
    const idSchema = z.string().regex(/^[a-f\d]{24}$/i);
    const assessmentId = parse(idSchema, req.params.assessmentId);
    const assessment = await Assessment.findOneAndDelete({
      _id: assessmentId,
      userId: req.auth.userId
    });
    if (!assessment) return res.status(404).json({ error: "Assessment not found." });
    return res.json({ message: "Assessment deleted." });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
