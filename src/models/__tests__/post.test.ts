import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { connectTestDb, disconnectTestDb, clearTestDb } from "@/lib/__tests__/testDb";
import Post from "@/models/Post";
import Category from "@/models/Category";

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

describe("Post model", () => {
  it("saves successfully with all required fields including an image with alt", async () => {
    const category = await makeCategory();
    const post = await Post.create({
      slug: "karwa-chauth-vrat-katha",
      title: "करवा चौथ व्रत कथा",
      intro: "एक समय की बात है...",
      contentSections: [
        { type: "text", content: "कथा का पहला भाग" },
        { type: "image", url: "https://example.com/img.jpg", alt: "करवा चौथ पूजा" },
      ],
      featuredImage: { url: "https://example.com/featured.jpg", alt: "करवा चौथ" },
      category: category._id,
      categoryName: category.name,
      tags: ["करवा चौथ", "व्रत"],
    });

    expect(post.slug).toBe("karwa-chauth-vrat-katha");
    expect(post.isActive).toBe(false);
    expect(post.viewCount).toBe(0);
  });

  it("raises a distinct duplicate-key error for a duplicate slug", async () => {
    const category = await makeCategory();
    const base = {
      title: "T",
      intro: "I",
      featuredImage: { url: "https://example.com/a.jpg", alt: "a" },
      category: category._id,
      categoryName: category.name,
    };
    await Post.create({ ...base, slug: "same-slug" });

    await expect(Post.create({ ...base, slug: "same-slug" })).rejects.toMatchObject({
      code: 11000,
    });
  });

  it("fails validation when an image section is missing alt text", async () => {
    const category = await makeCategory();
    await expect(
      Post.create({
        slug: "missing-alt",
        title: "T",
        intro: "I",
        contentSections: [{ type: "image", url: "https://example.com/x.jpg" }],
        featuredImage: { url: "https://example.com/a.jpg", alt: "a" },
        category: category._id,
        categoryName: category.name,
      })
    ).rejects.toThrow(/alt/i);
  });

  it("fails validation when the featured image is missing alt text", async () => {
    const category = await makeCategory();
    await expect(
      Post.create({
        slug: "missing-featured-alt",
        title: "T",
        intro: "I",
        featuredImage: { url: "https://example.com/a.jpg" },
        category: category._id,
        categoryName: category.name,
      })
    ).rejects.toThrow();
  });
});
