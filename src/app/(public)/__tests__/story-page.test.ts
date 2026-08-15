import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { connectTestDb, disconnectTestDb, clearTestDb } from "@/lib/__tests__/testDb";

vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
  updateTag: vi.fn(),
}));

const { getActiveStoryBySlug, listRelatedStories, incrementViewCount } = await import(
  "@/lib/publicStories"
);
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

async function makeCategory() {
  return Category.create({ name: "Vrat Katha", slug: "vrat-katha" });
}

describe("getActiveStoryBySlug", () => {
  it("returns an Active story rendered with title, sections, and images", async () => {
    const category = await makeCategory();
    await Post.create({
      slug: "karwa-chauth-vrat-katha",
      title: "करवा चौथ व्रत कथा",
      intro: "इंट्रो",
      contentSections: [{ type: "text", content: "कथा" }],
      featuredImage: { url: "https://example.com/a.jpg", alt: "करवा चौथ" },
      category: category._id,
      categoryName: category.name,
      isActive: true,
    });

    const story = await getActiveStoryBySlug("karwa-chauth-vrat-katha");
    expect(story?.title).toBe("करवा चौथ व्रत कथा");
    expect(story?.contentSections).toHaveLength(1);
  });

  it("returns null for an Inactive story's slug", async () => {
    const category = await makeCategory();
    await Post.create({
      slug: "draft-story",
      title: "T",
      intro: "I",
      featuredImage: { url: "https://example.com/a.jpg", alt: "a" },
      category: category._id,
      categoryName: category.name,
      isActive: false,
    });

    const story = await getActiveStoryBySlug("draft-story");
    expect(story).toBeNull();
  });

  it("returns null for a slug that was never created", async () => {
    const story = await getActiveStoryBySlug("never-existed");
    expect(story).toBeNull();
  });
});

describe("incrementViewCount", () => {
  it("atomically increments the view counter", async () => {
    const category = await makeCategory();
    const post = await Post.create({
      slug: "view-count-test",
      title: "T",
      intro: "I",
      featuredImage: { url: "https://example.com/a.jpg", alt: "a" },
      category: category._id,
      categoryName: category.name,
      isActive: true,
    });

    await incrementViewCount(post._id.toString());
    await incrementViewCount(post._id.toString());

    const updated = await Post.findById(post._id);
    expect(updated?.viewCount).toBe(2);
  });
});

describe("listRelatedStories", () => {
  it("returns other Active stories sharing the same category, excluding itself", async () => {
    const category = await makeCategory();
    const main = await Post.create({
      slug: "main-story",
      title: "Main",
      intro: "I",
      featuredImage: { url: "https://example.com/a.jpg", alt: "a" },
      category: category._id,
      categoryName: category.name,
      isActive: true,
      tags: ["teej"],
    });
    await Post.create({
      slug: "related-story",
      title: "Related",
      intro: "I",
      featuredImage: { url: "https://example.com/b.jpg", alt: "b" },
      category: category._id,
      categoryName: category.name,
      isActive: true,
      tags: ["teej"],
    });

    const story = await getActiveStoryBySlug(main.slug);
    const related = await listRelatedStories(story!);

    expect(related.map((r) => r.slug)).toEqual(["related-story"]);
  });
});
