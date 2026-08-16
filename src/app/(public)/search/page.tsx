import { searchActiveStories } from "@/lib/publicStories";
import { StoryCard } from "@/components/StoryCard";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const hasQuery = Boolean(q && q.trim());
  const results = hasQuery ? await searchActiveStories(q) : [];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-neutral-900">कथा खोजें</h1>

      <form method="get" className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="व्रत, त्योहार या कथा का नाम खोजें..."
          className="flex-1 rounded-lg border-2 border-amber-300 px-4 py-3 text-lg focus:border-amber-600 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-lg bg-amber-800 px-6 py-3 text-lg font-medium text-white hover:bg-amber-900"
        >
          खोजें
        </button>
      </form>

      {!hasQuery && (
        <p className="text-lg text-neutral-600">खोजने के लिए ऊपर कुछ लिखें।</p>
      )}

      {hasQuery && results.length === 0 && (
        <p className="text-lg text-neutral-600">कोई कथा नहीं मिली।</p>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
          {results.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      )}
    </div>
  );
}
