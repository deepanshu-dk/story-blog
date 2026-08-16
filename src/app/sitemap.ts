import type { MetadataRoute } from "next";
import { listActiveStories } from "@/lib/publicStories";

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

// Metadata Routes are statically prerendered by default, which would query the DB at
// *build* time - fragile (the build sandbox's network path to Atlas isn't guaranteed) and
// wrong for a CMS-backed site anyway, since publishing a story shouldn't require a rebuild
// to appear in the sitemap. force-dynamic makes this render per-request instead; the
// underlying listActiveStories() call is still unstable_cache-wrapped, so it's cheap.
export const dynamic = "force-dynamic";

// Generated dynamically from Active stories only - tagged the same as the shared 'posts'
// tag (via listActiveStories' unstable_cache wrapping) so it revalidates alongside every
// publish/unpublish, without a separate manual regeneration step.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();
  const stories = await listActiveStories(1000);

  const staticEntries: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/search`, changeFrequency: "weekly", priority: 0.5 },
  ];

  const storyEntries: MetadataRoute.Sitemap = stories.map((story) => ({
    url: `${baseUrl}/${story.slug}`,
    lastModified: new Date(story.createdAt),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticEntries, ...storyEntries];
}
