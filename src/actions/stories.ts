"use server";

import { connectToDatabase } from "@/lib/db";
import { requireAdminSession } from "@/lib/session";
import Post from "@/models/Post";
import { revalidateTags, postTag, categoryTag } from "@/lib/cacheTags";
import type { ContentSection, StoryImage, StorySeo } from "@/types/story";

export type { ContentSection as ContentSectionInput, StoryImage as ImageInput, StorySeo as SeoInput };

export interface StoryInput {
  slug: string;
  title: string;
  intro: string;
  contentSections: ContentSection[];
  featuredImage: StoryImage;
  category: string;
  categoryName: string;
  tags: string[];
  relatedPosts: string[];
  seo: StorySeo;
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

export async function getDashboardStats() {
  await requireAdminSession();
  await connectToDatabase();

  const [total, active, mostViewed] = await Promise.all([
    Post.countDocuments({}),
    Post.countDocuments({ isActive: true }),
    Post.find().sort({ viewCount: -1 }).limit(5).lean(),
  ]);

  return {
    total,
    active,
    inactive: total - active,
    mostViewed,
  };
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

  let created;
  try {
    created = await Post.create(input);
  } catch (err: unknown) {
    if (isDuplicateKeyError(err)) {
      throw new Error(`Slug "${input.slug}" is already in use`);
    }
    throw err;
  }

  await revalidateTags([postTag(created.slug), categoryTag(created.categoryName)]);
  return created;
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

  const previousSlug = existing.slug;
  const previousCategoryName = existing.categoryName;
  Object.assign(existing, input);

  try {
    await existing.save();
  } catch (err: unknown) {
    if (isDuplicateKeyError(err)) {
      throw new Error(`Slug "${input.slug}" is already in use`);
    }
    throw err;
  }

  await revalidateTags([
    postTag(existing.slug),
    postTag(previousSlug),
    categoryTag(existing.categoryName),
    categoryTag(previousCategoryName),
  ]);

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

  // Delete revalidates the same tag set as deactivating it, so the sitemap and listings
  // drop it immediately (see docs/plans - F2's delete-vs-deactivate handling).
  await revalidateTags([postTag(existing.slug), categoryTag(existing.categoryName)]);
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: number }).code === 11000
  );
}
