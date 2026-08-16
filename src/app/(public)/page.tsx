import { listActiveStories } from "@/lib/publicStories";
import { StoryCard } from "@/components/StoryCard";

// Statically prerendered by default, which queries the DB at *build* time - the build
// sandbox's network path to MongoDB Atlas isn't reliable (see sitemap.ts for the same
// issue). force-dynamic renders per-request instead; listActiveStories() is still
// unstable_cache-wrapped, so this stays cheap.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const stories = await listActiveStories(20);

  return (
    <div className="mx-auto max-w-4xl space-y-10 p-6">
      <section className="rounded-xl bg-amber-100 p-8 text-center">
        <h1 className="text-3xl font-bold leading-snug text-amber-900 sm:text-4xl">
          हिंदी व्रत कथा और त्योहार की कहानियाँ
        </h1>
        <p className="mt-3 text-lg text-neutral-800">
          पढ़िए करवा चौथ, तीज, नवरात्रि और अन्य व्रत-त्योहारों की सरल एवं संपूर्ण कथाएं।
        </p>
      </section>

      <section>
        <h2 className="mb-5 text-2xl font-bold text-neutral-900">नवीनतम कथाएं</h2>
        {stories.length === 0 ? (
          <p className="text-lg text-neutral-600">जल्द ही कथाएं जोड़ी जाएंगी।</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
            {stories.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
