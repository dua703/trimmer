const mongoose = require("mongoose");

const googleOAuthStateSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  expiresAt: { type: Date, required: true }
});

googleOAuthStateSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("GoogleOAuthState", googleOAuthStateSchema);
