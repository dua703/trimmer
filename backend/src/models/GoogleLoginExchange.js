const mongoose = require("mongoose");

const googleLoginExchangeSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  expiresAt: { type: Date, required: true }
});

googleLoginExchangeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("GoogleLoginExchange", googleLoginExchangeSchema);
