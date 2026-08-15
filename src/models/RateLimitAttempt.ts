import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const rateLimitAttemptSchema = new Schema({
  // e.g. "login:203.0.113.4" or "story-request:203.0.113.4"
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  lockedUntil: { type: Date },
  // TTL index: stale rate-limit records expire automatically instead of growing unbounded.
  updatedAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 }, // 24h
});

export type RateLimitAttemptDocument = InferSchemaType<typeof rateLimitAttemptSchema>;

export default (mongoose.models.RateLimitAttempt as Model<RateLimitAttemptDocument>) ??
  mongoose.model<RateLimitAttemptDocument>("RateLimitAttempt", rateLimitAttemptSchema);
