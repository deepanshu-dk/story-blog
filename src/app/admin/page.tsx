import Link from "next/link";
import { getDashboardStats } from "@/actions/stories";
import { SecurityActions } from "./SecurityActions";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-xl font-semibold text-neutral-900">Dashboard</h1>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded border border-neutral-200 p-4 text-center">
          <p className="text-2xl font-semibold text-neutral-900">{stats.total}</p>
          <p className="text-xs text-neutral-500">Total stories</p>
        </div>
        <div className="rounded border border-neutral-200 p-4 text-center">
          <p className="text-2xl font-semibold text-green-700">{stats.active}</p>
          <p className="text-xs text-neutral-500">Active</p>
        </div>
        <div className="rounded border border-neutral-200 p-4 text-center">
          <p className="text-2xl font-semibold text-neutral-500">{stats.inactive}</p>
          <p className="text-xs text-neutral-500">Inactive</p>
        </div>
      </div>

      <div className="flex gap-3">
        <Link
          href="/admin/stories"
          className="rounded border border-neutral-300 px-4 py-2 text-sm font-medium"
        >
          Manage stories
        </Link>
        <Link
          href="/admin/categories"
          className="rounded border border-neutral-300 px-4 py-2 text-sm font-medium"
        >
          Manage categories
        </Link>
        <Link
          href="/admin/requests"
          className="rounded border border-neutral-300 px-4 py-2 text-sm font-medium"
        >
          Story requests
        </Link>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">Most viewed</h2>
        {stats.mostViewed.length === 0 ? (
          <p className="text-sm text-neutral-500">No stories yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-200 rounded border border-neutral-200">
            {stats.mostViewed.map((story) => (
              <li key={story._id.toString()} className="flex justify-between p-3 text-sm">
                <Link
                  href={`/admin/stories/${story._id.toString()}/edit`}
                  className="hover:underline"
                >
                  {story.title}
                </Link>
                <span className="text-neutral-500">{story.viewCount} views</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-t border-neutral-200 pt-4">
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">Security</h2>
        <SecurityActions />
      </section>
    </div>
  );
}
