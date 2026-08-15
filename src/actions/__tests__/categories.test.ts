import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { connectTestDb, disconnectTestDb, clearTestDb } from "@/lib/__tests__/testDb";

vi.mock("@/lib/session", () => ({
  requireAdminSession: vi.fn().mockResolvedValue({ isAdmin: true }),
}));

const {
  createCategory,
  renameCategory,
  deleteCategory,
  repairCategoryNameDrift,
  ensureUncategorizedCategory,
} = await import("@/actions/categories");
const { default: Post } = await import("@/models/Post");
const { default: Category } = await import("@/models/Category");

beforeAll(async () => {
  await connectTestDb();
});

afterAll(async () => {
  await disconnectTestDb();
});

beforeEach(async () => {
  await clearTestDb();
});

async function makePost(categoryId: string, categoryName: string, slug = "test-post") {
  return Post.create({
    slug,
    title: "T",
    intro: "I",
    featuredImage: { url: "https://example.com/a.jpg", alt: "a" },
    category: categoryId,
    categoryName,
  });
}

describe("createCategory / renameCategory", () => {
  it("creates and renames, syncing categoryName on referencing posts", async () => {
    const category = await createCategory("Teej");
    const post = await makePost(category._id.toString(), category.name);

    await renameCategory(category._id.toString(), "Hartalika Teej");

    const updatedPost = await Post.findById(post._id);
    expect(updatedPost?.categoryName).toBe("Hartalika Teej");
  });
});

describe("deleteCategory", () => {
  it("reassigns posts to Uncategorized before deleting the category", async () => {
    const category = await createCategory("Diwali");
    await makePost(category._id.toString(), category.name, "post-1");
    await makePost(category._id.toString(), category.name, "post-2");

    await deleteCategory(category._id.toString());

    const remaining = await Category.findById(category._id);
    expect(remaining).toBeNull();

    const uncategorized = await ensureUncategorizedCategory();
    const posts = await Post.find({});
    for (const post of posts) {
      expect(post.category.toString()).toBe(uncategorized._id.toString());
      expect(post.categoryName).toBe("Uncategorized");
    }
  });

  it("rejects deleting the Uncategorized category itself", async () => {
    const uncategorized = await ensureUncategorizedCategory();
    await expect(deleteCategory(uncategorized._id.toString())).rejects.toThrow(/cannot be deleted/i);
  });

  it("aborts the delete if reassignment did not cover every referencing post", async () => {
    const category = await createCategory("Navratri");
    await makePost(category._id.toString(), category.name, "post-1");

    const updateManySpy = vi
      .spyOn(Post, "updateMany")
      .mockResolvedValueOnce({ modifiedCount: 0 } as never);

    await expect(deleteCategory(category._id.toString())).rejects.toThrow(/aborting delete/i);

    const stillExists = await Category.findById(category._id);
    expect(stillExists).not.toBeNull();

    updateManySpy.mockRestore();
  });
});

describe("repairCategoryNameDrift", () => {
  it("identifies and fixes posts whose categoryName no longer matches the category", async () => {
    const category = await createCategory("Ekadashi");
    const post = await makePost(category._id.toString(), "Stale Name", "post-1");

    const result = await repairCategoryNameDrift(category._id.toString());
    expect(result.driftedCount).toBe(1);

    const fixed = await Post.findById(post._id);
    expect(fixed?.categoryName).toBe("Ekadashi");
  });
});
