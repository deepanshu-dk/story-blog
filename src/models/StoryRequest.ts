import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const storyRequestSchema = new Schema(
  {
    message: { type: String, required: true, maxlength: 500 },
    reviewed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export type StoryRequestDocument = InferSchemaType<typeof storyRequestSchema>;

export default (mongoose.models.StoryRequest as Model<StoryRequestDocument>) ??
  mongoose.model<StoryRequestDocument>("StoryRequest", storyRequestSchema);
