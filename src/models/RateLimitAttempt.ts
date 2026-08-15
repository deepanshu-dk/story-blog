import mongoose, { Schema } from "mongoose";

const rateLimitAttemptSchema = new Schema({
  // e.g. "login:203.0.113.4" or "story-request:203.0.113.4"
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  lockedUntil: { type: Date },
  // TTL index: stale rate-limit records expire automatically instead of growing unbounded.
  updatedAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 }, // 24h
});

export default mongoose.models.RateLimitAttempt ||
  mongoose.model("RateLimitAttempt", rateLimitAttemptSchema);
