const mongoose = require("mongoose");

const groomingProfileSchema = new mongoose.Schema({
  skinType: {
    type: String,
    enum: ["oily", "dry", "combination", "normal", "unsure"],
    default: "unsure"
  },
  hairType: {
    type: String,
    enum: ["straight", "wavy", "curly", "coily", "unsure"],
    default: "unsure"
  },
  hairConcerns: { type: String, trim: true, maxlength: 1000, default: "" },
  beardStyle: { type: String, trim: true, maxlength: 80, default: "" },
  groomingPreferences: { type: String, trim: true, maxlength: 1500, default: "" },
  skinCareGoals: { type: String, trim: true, maxlength: 1000, default: "" },
  hairCareGoals: { type: String, trim: true, maxlength: 1000, default: "" },
  sensitivities: { type: String, trim: true, maxlength: 1500, default: "" }
}, { _id: false });

const preferencesSchema = new mongoose.Schema({
  routineFrequency: { type: String, enum: ["daily", "weekly"], default: "daily" },
  budgetAmount: { type: Number, min: 0, max: 1000000, default: 0 },
  budgetCurrency: { type: String, enum: ["USD", "PKR", "GBP", "EUR"], default: "USD" },
  language: { type: String, enum: ["en", "ur"], default: "en" },
  notifications: {
    email: { type: Boolean, default: false },
    assessmentReminders: { type: Boolean, default: true }
  }
}, { _id: false });

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 60 },
    middleName: { type: String, trim: true, maxlength: 60, default: "" },
    lastName: { type: String, required: true, trim: true, maxlength: 60 },
    username: { type: String, required: true, trim: true, lowercase: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    dateOfBirth: { type: Date, default: null },
    gender: {
      type: String,
      enum: ["", "female", "male", "non-binary", "prefer-not-to-say", "self-described"],
      default: ""
    },
    profilePicture: { type: String, default: null },
    groomingProfile: { type: groomingProfileSchema, default: () => ({}) },
    preferences: { type: preferencesSchema, default: () => ({}) },
    passwordHash: { type: String, default: null, select: false },
    googleSubject: { type: String, default: null, select: false },
    recoveryKeyDigests: { type: [String], required: true, select: false },
    recoveryKeysPending: { type: Boolean, default: false, select: false },
    emailVerified: { type: Boolean, default: false },
    emailVerifiedAt: { type: Date, default: null },
    emailVerification: {
      tokenHash: { type: String, default: null, select: false },
      expiresAt: { type: Date, default: null, select: false },
      lastSentAt: { type: Date, default: null, select: false }
    },
    unverifiedExpiresAt: { type: Date, default: null },
    authProvider: {
      type: String,
      enum: ["local", "google", "local+google"],
      required: true
    }
  },
  { timestamps: true }
);

userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });
userSchema.index(
  { googleSubject: 1 },
  { unique: true, sparse: true, partialFilterExpression: { googleSubject: { $type: "string" } } }
);
// Never-verified accounts are removed so abandoned emails/usernames are not blocked forever.
userSchema.index({ unverifiedExpiresAt: 1 }, { expireAfterSeconds: 0 });
userSchema.index(
  { "emailVerification.tokenHash": 1 },
  { partialFilterExpression: { "emailVerification.tokenHash": { $type: "string" } } }
);

module.exports = mongoose.model("User", userSchema);
