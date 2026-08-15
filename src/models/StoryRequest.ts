import mongoose, { Schema } from "mongoose";

const storyRequestSchema = new Schema(
  {
    message: { type: String, required: true, maxlength: 500 },
    reviewed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.StoryRequest || mongoose.model("StoryRequest", storyRequestSchema);
