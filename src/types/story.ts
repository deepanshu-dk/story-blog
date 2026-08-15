// Shared shape for a story's content section, mirroring the Post schema's
// discriminated text|image union. Single source of truth across the Server Action layer
// (src/actions/stories.ts), the public read layer (src/lib/publicStories.ts), and the
// admin editor (src/app/admin/stories/StoryForm.tsx) - previously duplicated three times.
export interface ContentSection {
  type: "text" | "image";
  content?: string;
  url?: string;
  alt?: string;
  caption?: string;
}

export interface StoryImage {
  url: string;
  alt: string;
  caption?: string;
}

export interface StorySeo {
  title?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
}
