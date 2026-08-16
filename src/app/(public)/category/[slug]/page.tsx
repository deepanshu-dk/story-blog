import { notFound } from "next/navigation";
import { connectToDatabase } from "@/lib/db";
import Category from "@/models/Category";
import { listActiveStoriesByCategory } from "@/lib/publicStories";
import { StoryCard } from "@/components/StoryCard";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  await connectToDatabase();
  const category = await Category.findOne({ slug }).lean();
  if (!category) {
    notFound();
  }

  const stories = await listActiveStoriesByCategory(category.name);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-neutral-900">{category.name}</h1>
      {stories.length === 0 ? (
        <p className="text-lg text-neutral-600">इस श्रेणी में अभी कोई कथा नहीं है।</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
          {stories.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      )}
    </div>
  );
}
