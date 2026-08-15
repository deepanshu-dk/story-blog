import { listActiveStories } from "@/lib/publicStories";
import { StoryCard } from "@/components/StoryCard";

export default async function HomePage() {
  const stories = await listActiveStories(20);

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <section className="rounded-lg bg-amber-100 p-6 text-center">
        <h1 className="text-2xl font-semibold text-amber-900">
          हिंदी व्रत कथा और त्योहार की कहानियाँ
        </h1>
        <p className="mt-2 text-sm text-neutral-700">
          पढ़िए करवा चौथ, तीज, नवरात्रि और अन्य व्रत-त्योहारों की सरल एवं संपूर्ण कथाएं।
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">नवीनतम कथाएं</h2>
        {stories.length === 0 ? (
          <p className="text-sm text-neutral-500">जल्द ही कथाएं जोड़ी जाएंगी।</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {stories.map((story) => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
