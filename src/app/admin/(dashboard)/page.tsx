import Link from "next/link";
import { getDashboardStats } from "@/actions/stories";
import { SecurityActions } from "./SecurityActions";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
        <Link
          href="/admin/stories/new"
          className="rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-700"
        >
          + New story
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">Total stories</p>
          <p className="mt-1 text-3xl font-bold text-neutral-900">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">Active</p>
          <p className="mt-1 text-3xl font-bold text-green-700">{stats.active}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">Inactive</p>
          <p className="mt-1 text-3xl font-bold text-neutral-500">{stats.inactive}</p>
        </div>
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-neutral-800">Most viewed</h2>
        {stats.mostViewed.length === 0 ? (
          <p className="text-sm text-neutral-500">No stories yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {stats.mostViewed.map((story) => (
              <li key={story._id.toString()} className="flex items-center justify-between py-3">
                <Link
                  href={`/admin/stories/${story._id.toString()}/edit`}
                  className="text-sm font-medium text-neutral-800 hover:text-amber-700 hover:underline"
                >
                  {story.title}
                </Link>
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">
                  {story.viewCount} views
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-neutral-800">Security</h2>
        <SecurityActions />
      </section>
    </div>
  );
}
