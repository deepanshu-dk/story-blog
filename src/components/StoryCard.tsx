import Link from "next/link";
import type { PublicStory } from "@/lib/publicStories";

export function StoryCard({ story }: { story: PublicStory }) {
  return (
    <Link
      href={`/${story.slug}`}
      className="block overflow-hidden rounded-xl border-2 border-amber-200 bg-white transition hover:shadow-lg"
    >
      {/* Cloudinary-hosted images are remote; keep this simple <img> rather than
          configuring next/image remote patterns for a fixed single-provider source. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={story.featuredImage.url}
        alt={story.featuredImage.alt}
        className="h-48 w-full object-cover"
      />
      <div className="p-5">
        <p className="text-sm font-semibold text-amber-700">{story.categoryName}</p>
        <h3 className="mt-1 text-xl font-bold text-neutral-900">{story.title}</h3>
        <p className="mt-2 line-clamp-2 text-base text-neutral-700">{story.intro}</p>
      </div>
    </Link>
  );
}
