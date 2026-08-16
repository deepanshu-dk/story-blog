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
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Stories</h1>
        <Link
          href="/admin/stories/new"
          className="rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-700"
        >
          + New story
        </Link>
      </div>

      <form
        className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
        method="get"
      >
        <input
          type="text"
          name="q"
          defaultValue={params.q}
          placeholder="Search title, tag, or category..."
          className="min-w-[220px] flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        <select
          name="category"
          defaultValue={params.category ?? ""}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
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
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          name="sort"
          defaultValue={params.sort ?? "date"}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="date">Newest</option>
          <option value="views">Most viewed</option>
        </select>
        <button
          type="submit"
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
        >
          Filter
        </button>
      </form>

      {stories.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center text-sm text-neutral-500">
          {params.q || params.category || (params.state && params.state !== "all")
            ? "No stories match your filters."
            : "No stories yet. Create your first one."}
        </p>
      ) : (
        <ul className="space-y-2">
          {stories.map((story) => (
            <li
              key={story._id.toString()}
              className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-amber-300"
            >
              <div>
                <Link
                  href={`/admin/stories/${story._id.toString()}/edit`}
                  className="text-base font-semibold text-neutral-900 hover:text-amber-700 hover:underline"
                >
                  {story.title}
                </Link>
                <p className="mt-1 text-sm text-neutral-500">
                  {story.categoryName} &middot; {story.viewCount} views
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
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
