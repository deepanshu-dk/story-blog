"use server";

import { connectToDatabase } from "@/lib/db";
import { requireAdminSession } from "@/lib/session";
import Post from "@/models/Post";

export interface ContentSectionInput {
  type: "text" | "image";
  content?: string;
  url?: string;
  alt?: string;
  caption?: string;
}

export interface ImageInput {
  url: string;
  alt: string;
  caption?: string;
}

export interface SeoInput {
  title?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
}

export interface StoryInput {
  slug: string;
  title: string;
  intro: string;
  contentSections: ContentSectionInput[];
  featuredImage: ImageInput;
  category: string;
  categoryName: string;
  tags: string[];
  relatedPosts: string[];
  seo: SeoInput;
}

export interface StoryListFilters {
  search?: string;
  category?: string;
  activeState?: "active" | "inactive" | "all";
  sort?: "date" | "views";
}

/**
 * Blocks the Active transition (and re-runs on every subsequent save while Active) if any
 * image section - or the featured image - lacks alt text (see docs/plans - U5 Approach).
 */
function findMissingAltText(input: Pick<StoryInput, "contentSections" | "featuredImage">): boolean {
  if (!input.featuredImage.alt) return true;
  return input.contentSections.some((section) => section.type === "image" && !section.alt);
}

export async function listStories(filters: StoryListFilters = {}) {
  await requireAdminSession();
  await connectToDatabase();

  const query: Record<string, unknown> = {};
  if (filters.search) {
    query.$text = { $search: filters.search };
  }
  if (filters.category) {
    query.category = filters.category;
  }
  if (filters.activeState === "active") {
    query.isActive = true;
  } else if (filters.activeState === "inactive") {
    query.isActive = false;
  }

  const sortSpec: Record<string, 1 | -1> =
    filters.sort === "views" ? { viewCount: -1 } : { createdAt: -1 };

  return Post.find(query).sort(sortSpec).lean();
}

export async function getStoryById(id: string) {
  await requireAdminSession();
  await connectToDatabase();
  return Post.findById(id).lean();
}

export async function createStory(input: StoryInput & { isActive: boolean }) {
  await requireAdminSession();
  await connectToDatabase();

  if (input.isActive && findMissingAltText(input)) {
    throw new Error("Every image needs alt text before a story can go Active");
  }

  try {
    return await Post.create(input);
  } catch (err: unknown) {
    if (isDuplicateKeyError(err)) {
      throw new Error(`Slug "${input.slug}" is already in use`);
    }
    throw err;
  }
}

export async function updateStory(
  id: string,
  input: StoryInput & { isActive: boolean }
) {
  await requireAdminSession();
  await connectToDatabase();

  const existing = await Post.findById(id);
  if (!existing) {
    throw new Error("Story not found");
  }

  // Slug is locked once the story is currently Active - deactivate first to rename.
  if (existing.isActive && input.slug !== existing.slug) {
    throw new Error("Deactivate this story before changing its slug");
  }

  // Re-run the alt-text guard on every save while Active, not just at the toggle moment -
  // otherwise an admin could blank an image's alt text on an already-live story.
  const willBeActive = input.isActive;
  if (willBeActive && findMissingAltText(input)) {
    throw new Error("Every image needs alt text before a story can go Active");
  }

  Object.assign(existing, input);

  try {
    await existing.save();
  } catch (err: unknown) {
    if (isDuplicateKeyError(err)) {
      throw new Error(`Slug "${input.slug}" is already in use`);
    }
    throw err;
  }

  return existing;
}

export async function deleteStory(id: string) {
  await requireAdminSession();
  await connectToDatabase();

  const existing = await Post.findById(id);
  if (!existing) {
    throw new Error("Story not found");
  }

  await Post.deleteOne({ _id: id });
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: number }).code === 11000
  );
}
