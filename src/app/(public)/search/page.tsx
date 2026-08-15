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
      <h1 className="text-xl font-semibold text-neutral-900">कथा खोजें</h1>

      <form method="get" className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="व्रत, त्योहार या कथा का नाम खोजें..."
          className="flex-1 rounded border border-amber-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded bg-amber-800 px-4 py-2 text-sm font-medium text-white"
        >
          खोजें
        </button>
      </form>

      {!hasQuery && (
        <p className="text-sm text-neutral-500">खोजने के लिए ऊपर कुछ लिखें।</p>
      )}

      {hasQuery && results.length === 0 && (
        <p className="text-sm text-neutral-500">कोई कथा नहीं मिली।</p>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {results.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      )}
    </div>
  );
}
