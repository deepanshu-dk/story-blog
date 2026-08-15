import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { connectTestDb, disconnectTestDb, clearTestDb } from "@/lib/__tests__/testDb";

vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
  updateTag: vi.fn(),
}));

const { default: sitemap } = await import("@/app/sitemap");
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

async function makeStory(slug: string, isActive: boolean) {
  const category = await Category.findOneAndUpdate(
    { slug: "vrat-katha" },
    { name: "Vrat Katha", slug: "vrat-katha" },
    { upsert: true, returnDocument: "after" }
  );
  return Post.create({
    slug,
    title: "T",
    intro: "I",
    featuredImage: { url: "https://example.com/a.jpg", alt: "a" },
    category: category._id,
    categoryName: category.name,
    isActive,
  });
}

describe("sitemap", () => {
  it("lists exactly the currently-Active stories' URLs", async () => {
    await makeStory("active-story", true);
    await makeStory("inactive-story", false);

    const entries = await sitemap();
    const storyUrls = entries.map((e) => e.url);

    expect(storyUrls.some((u) => u.endsWith("/active-story"))).toBe(true);
    expect(storyUrls.some((u) => u.endsWith("/inactive-story"))).toBe(false);
  });

  it("removes a story from the next fetch once deactivated", async () => {
    const post = await makeStory("toggle-story", true);
    let entries = await sitemap();
    expect(entries.some((e) => e.url.endsWith("/toggle-story"))).toBe(true);

    post.isActive = false;
    await post.save();

    entries = await sitemap();
    expect(entries.some((e) => e.url.endsWith("/toggle-story"))).toBe(false);
  });
});
