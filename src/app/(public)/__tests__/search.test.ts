import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { connectTestDb, disconnectTestDb, clearTestDb } from "@/lib/__tests__/testDb";

vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
  updateTag: vi.fn(),
}));

const { searchActiveStories } = await import("@/lib/publicStories");
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

describe("searchActiveStories", () => {
  it("returns an Active story matching an exact Devanagari title", async () => {
    const category = await Category.create({ name: "Vrat Katha", slug: "vrat-katha" });
    await Post.create({
      slug: "karwa-chauth-vrat-katha",
      title: "करवा चौथ व्रत कथा",
      intro: "इंट्रो",
      featuredImage: { url: "https://example.com/a.jpg", alt: "a" },
      category: category._id,
      categoryName: category.name,
      isActive: true,
    });

    const results = await searchActiveStories("करवा चौथ");
    expect(results.map((r) => r.slug)).toContain("karwa-chauth-vrat-katha");
  });

  it("does not return a matching Inactive story", async () => {
    const category = await Category.create({ name: "Vrat Katha", slug: "vrat-katha" });
    await Post.create({
      slug: "draft-story",
      title: "गुप्त कथा",
      intro: "इंट्रो",
      featuredImage: { url: "https://example.com/a.jpg", alt: "a" },
      category: category._id,
      categoryName: category.name,
      isActive: false,
    });

    const results = await searchActiveStories("गुप्त");
    expect(results).toHaveLength(0);
  });

  it("returns an empty result for an empty query rather than the entire collection", async () => {
    const category = await Category.create({ name: "Vrat Katha", slug: "vrat-katha" });
    await Post.create({
      slug: "some-story",
      title: "T",
      intro: "I",
      featuredImage: { url: "https://example.com/a.jpg", alt: "a" },
      category: category._id,
      categoryName: category.name,
      isActive: true,
    });

    const results = await searchActiveStories("");
    expect(results).toHaveLength(0);
  });

  it("rejects a non-string query rather than passing it into the $text query", async () => {
    const results = await searchActiveStories({ $where: "1==1" });
    expect(results).toHaveLength(0);
  });
});
