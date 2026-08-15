import { unstable_cache } from "next/cache";
import { connectToDatabase } from "@/lib/db";
import Post from "@/models/Post";
import { POSTS_TAG, postTag, categoryTag } from "@/lib/cacheTags";

export interface PublicContentSection {
  type: "text" | "image";
  content?: string;
  url?: string;
  alt?: string;
  caption?: string;
}

export interface PublicImage {
  url: string;
  alt: string;
  caption?: string;
}

export interface PublicSeo {
  title?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
}

export interface PublicStory {
  id: string;
  slug: string;
  title: string;
  intro: string;
  contentSections: PublicContentSection[];
  featuredImage: PublicImage;
  category: string;
  categoryName: string;
  tags: string[];
  relatedPosts: string[];
  seo: PublicSeo;
  viewCount: number;
  createdAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializePost(post: any): PublicStory {
  return {
    id: post._id.toString(),
    slug: post.slug,
    title: post.title,
    intro: post.intro,
    contentSections: post.contentSections ?? [],
    featuredImage: post.featuredImage,
    category: post.category.toString(),
    categoryName: post.categoryName,
    tags: post.tags ?? [],
    relatedPosts: (post.relatedPosts ?? []).map((p: { toString(): string }) => p.toString()),
    seo: post.seo ?? {},
    viewCount: post.viewCount,
    createdAt: new Date(post.createdAt).toISOString(),
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
      return post ? serializePost(post) : null;
    },
    ["active-story", slug],
    { tags: [POSTS_TAG, postTag(slug)] }
  )();
}

export async function listActiveStories(limit = 20): Promise<PublicStory[]> {
  return unstable_cache(
    async () => {
      await connectToDatabase();
      const posts = await Post.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
      return posts.map(serializePost);
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
      return posts.map(serializePost);
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
      return posts.map(serializePost);
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
 * Data Cache without bound. A direct, `isActive: true`-filtered $text query is simple and
 * sufficient at this scale (see docs/plans - Key Technical Decisions: Search).
 *
 * The incoming query is coerced to a string and rejected if it isn't one, rather than
 * passed through to the $text query as-is.
 */
export async function searchActiveStories(rawQuery: unknown): Promise<PublicStory[]> {
  if (typeof rawQuery !== "string" || rawQuery.trim().length === 0) {
    return [];
  }

  await connectToDatabase();
  const posts = await Post.find(
    { isActive: true, $text: { $search: rawQuery } },
    { score: { $meta: "textScore" } }
  )
    .sort({ score: { $meta: "textScore" } })
    .lean();

  return posts.map(serializePost);
}
