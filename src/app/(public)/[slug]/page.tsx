import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getActiveStoryBySlug,
  getStoryPreviewBySlug,
  listRelatedStories,
  incrementViewCount,
} from "@/lib/publicStories";
import { getSession } from "@/lib/session";
import { StoryCard } from "@/components/StoryCard";
import { StoryRequestForm } from "@/components/StoryRequestForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const story = await getActiveStoryBySlug(slug);
  if (!story) {
    return {};
  }

  const title = story.seo.title || story.title;
  const description = story.seo.metaDescription || story.intro;
  const ogImage = story.seo.ogImage || story.featuredImage.url;

  return {
    title,
    description,
    alternates: story.seo.canonicalUrl ? { canonical: story.seo.canonicalUrl } : undefined,
    openGraph: {
      title: story.seo.ogTitle || title,
      description: story.seo.ogDescription || description,
      images: [ogImage],
    },
  };
}

export default async function StoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getSession();

  let story = await getActiveStoryBySlug(slug);
  if (!story && session.isAdmin) {
    // Lets an admin preview a draft/deactivated story via StoryForm's Preview button -
    // requireAdminSession() inside getStoryPreviewBySlug is the real gate; this check is
    // just an optimization to skip the extra lookup for non-admin visitors.
    story = await getStoryPreviewBySlug(slug);
  }

  // Next.js App Router pages can only cleanly emit 404 (via notFound()) - there is no
  // first-class way to emit a genuine 410 without dropping to a hand-built Route Handler
  // and losing the Metadata API / RSC rendering this page relies on. Both "deactivated"
  // and "never existed" resolve to a 404 here; notFound() already injects a noindex meta
  // tag, which covers most of the practical de-indexing goal even without the 410 code.
  if (!story) {
    notFound();
  }

  if (!session.isAdmin) {
    await incrementViewCount(story.id);
  }

  const related = await listRelatedStories(story);

  return (
    <article className="mx-auto max-w-2xl space-y-8 p-6">
      {session.isAdmin && !story.isActive && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Preview mode - this story is not Active and isn&apos;t visible to visitors yet.
        </p>
      )}
      <header className="space-y-3">
        <p className="text-base font-semibold text-amber-700">{story.categoryName}</p>
        <h1 className="text-3xl font-bold leading-snug text-neutral-900 sm:text-4xl">
          {story.title}
        </h1>
        <p className="text-xl leading-relaxed text-neutral-800">{story.intro}</p>
      </header>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={story.featuredImage.url}
        alt={story.featuredImage.alt}
        className="w-full rounded-xl object-cover"
      />

      <div className="max-w-none space-y-5">
        {story.contentSections.map((section, index) =>
          section.type === "text" ? (
            <p key={index} className="whitespace-pre-line text-xl leading-loose text-neutral-800">
              {section.content}
            </p>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={index}
              src={section.url}
              alt={section.alt}
              className="w-full rounded-xl object-cover"
            />
          )
        )}
      </div>

      {related.length > 0 && (
        <section>
          <h2 className="mb-4 text-2xl font-bold text-neutral-900">संबंधित कथाएं</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {related.map((r) => (
              <StoryCard key={r.id} story={r} />
            ))}
          </div>
        </section>
      )}

      <StoryRequestForm />
    </article>
  );
}
