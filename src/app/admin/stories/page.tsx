import Link from "next/link";
import { listStories } from "@/actions/stories";
import { listCategories } from "@/actions/categories";

export const dynamic = "force-dynamic";

interface SearchParams {
  q?: string;
  category?: string;
  state?: "active" | "inactive" | "all";
  sort?: "date" | "views";
}

export default async function StoriesListPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const categories = await listCategories();

  const stories = await listStories({
    search: params.q,
    category: params.category,
    activeState: params.state ?? "all",
    sort: params.sort ?? "date",
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Stories</h1>
        <Link
          href="/admin/stories/new"
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          New Story
        </Link>
      </div>

      <form className="flex flex-wrap gap-2" method="get">
        <input
          type="text"
          name="q"
          defaultValue={params.q}
          placeholder="Search title..."
          className="rounded border border-neutral-300 px-3 py-1.5 text-sm"
        />
        <select
          name="category"
          defaultValue={params.category ?? ""}
          className="rounded border border-neutral-300 px-3 py-1.5 text-sm"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c._id.toString()} value={c._id.toString()}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          name="state"
          defaultValue={params.state ?? "all"}
          className="rounded border border-neutral-300 px-3 py-1.5 text-sm"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          name="sort"
          defaultValue={params.sort ?? "date"}
          className="rounded border border-neutral-300 px-3 py-1.5 text-sm"
        >
          <option value="date">Newest</option>
          <option value="views">Most viewed</option>
        </select>
        <button
          type="submit"
          className="rounded border border-neutral-300 px-3 py-1.5 text-sm"
        >
          Filter
        </button>
      </form>

      {stories.length === 0 ? (
        <p className="p-6 text-center text-sm text-neutral-500">
          {params.q || params.category || (params.state && params.state !== "all")
            ? "No stories match your filters."
            : "No stories yet. Create your first one."}
        </p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded border border-neutral-200">
          {stories.map((story) => (
            <li key={story._id.toString()} className="flex items-center justify-between p-3">
              <div>
                <Link
                  href={`/admin/stories/${story._id.toString()}/edit`}
                  className="text-sm font-medium text-neutral-900 hover:underline"
                >
                  {story.title}
                </Link>
                <p className="text-xs text-neutral-500">
                  {story.categoryName} &middot; {story.viewCount} views
                </p>
              </div>
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${
                  story.isActive
                    ? "bg-green-100 text-green-800"
                    : "bg-neutral-100 text-neutral-600"
                }`}
              >
                {story.isActive ? "Active" : "Inactive"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
