import mongoose, { Schema, type InferSchemaType } from "mongoose";

const contentSectionSchema = new Schema(
  {
    type: { type: String, enum: ["text", "image"], required: true },
    // "text" sections use `content`; "image" sections use `url` + `alt` (+ optional `caption`).
    content: { type: String },
    url: { type: String },
    alt: { type: String },
    caption: { type: String },
  },
  { _id: false }
);

contentSectionSchema.pre("validate", function () {
  if (this.type === "text" && !this.content) {
    throw new Error("Text sections require `content`");
  }
  if (this.type === "image") {
    if (!this.url) {
      throw new Error("Image sections require `url`");
    }
    if (!this.alt) {
      throw new Error("Image sections require `alt` text");
    }
  }
});

const imageWithAltSchema = new Schema(
  {
    url: { type: String, required: true },
    alt: { type: String, required: true },
    caption: { type: String },
  },
  { _id: false }
);

const seoSchema = new Schema(
  {
    title: { type: String },
    metaDescription: { type: String },
    canonicalUrl: { type: String },
    ogTitle: { type: String },
    ogDescription: { type: String },
    ogImage: { type: String },
  },
  { _id: false }
);

const postSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true },
    intro: { type: String, required: true },
    contentSections: { type: [contentSectionSchema], default: [] },
    featuredImage: { type: imageWithAltSchema, required: true },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    categoryName: { type: String, required: true },
    tags: { type: [String], default: [] },
    relatedPosts: { type: [Schema.Types.ObjectId], ref: "Post", default: [] },
    seo: { type: seoSchema, default: {} },
    isActive: { type: Boolean, default: false },
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

postSchema.index(
  { title: "text", tags: "text", categoryName: "text" },
  { default_language: "none", name: "post_text_search" }
);

export type PostDocument = InferSchemaType<typeof postSchema>;

export default mongoose.models.Post || mongoose.model("Post", postSchema);
