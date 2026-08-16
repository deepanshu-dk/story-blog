import { unstable_cache } from "next/cache";
import type { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import Post, { type PostDocument } from "@/models/Post";
import { POSTS_TAG, postTag, categoryTag } from "@/lib/cacheTags";
import { buildSearchQuery } from "@/lib/searchQuery";
import { requireAdminSession } from "@/lib/session";
import type { ContentSection, StoryImage, StorySeo } from "@/types/story";

export type { ContentSection as PublicContentSection, StoryImage as PublicImage, StorySeo as PublicSeo };

export interface PublicStory {
  id: string;
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
  viewCount: number;
  createdAt: string;
  isActive: boolean;
}

type LeanPost = PostDocument & { _id: Types.ObjectId };

function serializePost(post: LeanPost): PublicStory {
  const seo = post.seo ?? {};
  return {
    id: post._id.toString(),
    slug: post.slug,
    title: post.title,
    intro: post.intro,
    contentSections: (post.contentSections ?? []).map((section) => ({
      type: section.type,
      content: section.content ?? undefined,
      url: section.url ?? undefined,
      alt: section.alt ?? undefined,
      caption: section.caption ?? undefined,
    })),
    featuredImage: { url: post.featuredImage.url, alt: post.featuredImage.alt ?? "" },
    category: post.category.toString(),
    categoryName: post.categoryName,
    tags: post.tags ?? [],
    relatedPosts: (post.relatedPosts ?? []).map((p: { toString(): string }) => p.toString()),
    seo: {
      title: seo.title ?? undefined,
      metaDescription: seo.metaDescription ?? undefined,
      canonicalUrl: seo.canonicalUrl ?? undefined,
      ogTitle: seo.ogTitle ?? undefined,
      ogDescription: seo.ogDescription ?? undefined,
      ogImage: seo.ogImage ?? undefined,
    },
    viewCount: post.viewCount,
    createdAt: new Date(post.createdAt).toISOString(),
    isActive: post.isActive,
  };
}

/**
 * Only Active stories are ever returned here - callers (U8's [slug] route) are responsible
 * for treating a null result as "not servable" (410 for a deactivated story, 404 for a
 * slug that never existed - see docs/plans - U8 Approach).
 */
export async function getActiveStoryBySlug(slug: string): Promise<PublicStory | null> {
  return unstable_cache(
    async () => {
      await connectToDatabase();
      const post = await Post.findOne({ slug, isActive: true }).lean();
      return post ? serializePost(post as LeanPost) : null;
    },
    ["active-story", slug],
    { tags: [POSTS_TAG, postTag(slug)] }
  )();
}

/**
 * Lets an authenticated admin preview a draft or deactivated story before it's Active -
 * requireAdminSession() throws for anyone else. Deliberately not cached via unstable_cache,
 * since a preview must always reflect the just-saved draft, not a stale Data Cache entry.
 */
export async function getStoryPreviewBySlug(slug: string): Promise<PublicStory | null> {
  await requireAdminSession();
  await connectToDatabase();
  const post = await Post.findOne({ slug }).lean();
  return post ? serializePost(post as LeanPost) : null;
}

export async function listActiveStories(limit = 20): Promise<PublicStory[]> {
  return unstable_cache(
    async () => {
      await connectToDatabase();
      const posts = await Post.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
      return (posts as LeanPost[]).map(serializePost);
    },
    ["active-stories", String(limit)],
    { tags: [POSTS_TAG] }
  )();
}

export async function listActiveStoriesByCategory(categoryName: string): Promise<PublicStory[]> {
  return unstable_cache(
    async () => {
      await connectToDatabase();
      const posts = await Post.find({ isActive: true, categoryName }).sort({ createdAt: -1 }).lean();
      return (posts as LeanPost[]).map(serializePost);
    },
    ["active-stories-by-category", categoryName],
    { tags: [POSTS_TAG, categoryTag(categoryName)] }
  )();
}

export async function listRelatedStories(story: PublicStory, limit = 4): Promise<PublicStory[]> {
  return unstable_cache(
    async () => {
      await connectToDatabase();
      const posts = await Post.find({
        isActive: true,
        _id: { $ne: story.id },
        $or: [{ category: story.category }, { tags: { $in: story.tags } }],
      })
        .limit(limit)
        .lean();
      return (posts as LeanPost[]).map(serializePost);
    },
    ["related-stories", story.id],
    { tags: [POSTS_TAG, categoryTag(story.categoryName)] }
  )();
}

/** Atomic increment, never a read-modify-write - not cached, since it's a write. */
export async function incrementViewCount(storyId: string): Promise<void> {
  await connectToDatabase();
  await Post.updateOne({ _id: storyId }, { $inc: { viewCount: 1 } });
}

/**
 * Not cached via unstable_cache - unlike the fixed set of listing/story reads above,
 * search query strings are unbounded, so caching every distinct query would grow the
 * Data Cache without bound. A direct, `isActive: true`-filtered substring match is simple
 * and sufficient at this scale (see docs/plans - Key Technical Decisions: Search).
 *
 * The incoming query is coerced to a string and rejected if it isn't one, rather than
 * passed through to the query as-is.
 */
export async function searchActiveStories(rawQuery: unknown): Promise<PublicStory[]> {
  if (typeof rawQuery !== "string" || rawQuery.trim().length === 0) {
    return [];
  }

  await connectToDatabase();
  const posts = await Post.find({ isActive: true, ...buildSearchQuery(rawQuery) })
    .sort({ createdAt: -1 })
    .lean();

  return (posts as LeanPost[]).map(serializePost);
}
