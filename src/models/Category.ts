import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const UNCATEGORIZED_SLUG = "uncategorized";

const categorySchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, trim: true },
    // The seeded "Uncategorized" category cannot be deleted (guarded in actions/categories.ts).
    isProtected: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export type CategoryDocument = InferSchemaType<typeof categorySchema>;

export default (mongoose.models.Category as Model<CategoryDocument>) ??
  mongoose.model<CategoryDocument>("Category", categorySchema);
