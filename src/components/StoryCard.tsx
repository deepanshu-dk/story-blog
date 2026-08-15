import Link from "next/link";
import type { PublicStory } from "@/lib/publicStories";

export function StoryCard({ story }: { story: PublicStory }) {
  return (
    <Link
      href={`/${story.slug}`}
      className="block overflow-hidden rounded-lg border border-amber-200 bg-white transition hover:shadow-md"
    >
      {/* Cloudinary-hosted images are remote; keep this simple <img> rather than
          configuring next/image remote patterns for a fixed single-provider source. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={story.featuredImage.url}
        alt={story.featuredImage.alt}
        className="h-40 w-full object-cover"
      />
      <div className="p-4">
        <p className="text-xs font-medium text-amber-700">{story.categoryName}</p>
        <h3 className="mt-1 text-base font-semibold text-neutral-900">{story.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{story.intro}</p>
      </div>
    </Link>
  );
}
