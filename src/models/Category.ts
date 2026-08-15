import mongoose, { Schema } from "mongoose";

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

export default mongoose.models.Category || mongoose.model("Category", categorySchema);
