import { updateTag } from "next/cache";

// Shared tag-name helpers so producer (unstable_cache reads in U8/U9/U12) and consumer
// (updateTag calls in U5/U6 mutations) sides can't drift.
export const POSTS_TAG = "posts";

export function postTag(slug: string): string {
  return `post-${slug}`;
}

export function categoryTag(categoryName: string): string {
  return `category-${categoryName}`;
}

/**
 * Invalidates the shared 'posts' tag plus any specific tags supplied, after a successful
 * DB write. Uses `updateTag` (Next.js 16+) rather than `revalidateTag` - every call site is
 * inside a Server Action, and `updateTag` is the purpose-built API for immediate,
 * read-your-own-writes invalidation from Server Actions (revalidateTag requires a second
 * cacheLife-profile argument and is meant for Route Handlers / other contexts instead).
 * If updateTag throws, the error is logged (not swallowed and not thrown) - the DB write
 * already succeeded, so surfacing this as a request failure would be wrong, but silently
 * ignoring it would leave pages stale with no signal at all (see docs/plans - Key
 * Technical Decisions: Revalidation).
 */
export async function revalidateTags(specificTags: string[] = []): Promise<void> {
  try {
    updateTag(POSTS_TAG);
    for (const tag of specificTags) {
      updateTag(tag);
    }
  } catch (err) {
    console.error("[cacheTags] updateTag failed after a successful DB write:", err);
  }
}
