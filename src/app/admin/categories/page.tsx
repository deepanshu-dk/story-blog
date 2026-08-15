import { listCategories, ensureUncategorizedCategory } from "@/actions/categories";
import { CategoryManager } from "./CategoryManager";

// Admin pages are always per-request (session-gated, DB-backed) - never statically prerendered.
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  await ensureUncategorizedCategory();
  const categoriesRaw = await listCategories();
  const categories = categoriesRaw.map((c) => ({
    _id: c._id.toString(),
    name: c.name,
    slug: c.slug,
    isProtected: c.isProtected,
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-xl font-semibold text-neutral-900">Categories</h1>
      <CategoryManager categories={categories} />
    </div>
  );
}
