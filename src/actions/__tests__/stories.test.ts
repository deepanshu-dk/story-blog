import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { connectTestDb, disconnectTestDb, clearTestDb } from "@/lib/__tests__/testDb";

vi.mock("@/lib/session", () => ({
  requireAdminSession: vi.fn().mockResolvedValue({ isAdmin: true }),
}));

const { createStory, updateStory, deleteStory, getStoryById } = await import("@/actions/stories");
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

async function baseInput(overrides: Partial<Parameters<typeof createStory>[0]> = {}) {
  const category = await Category.create({ name: "Vrat Katha", slug: "vrat-katha" });
  return {
    slug: "karwa-chauth-vrat-katha",
    title: "करवा चौथ व्रत कथा",
    intro: "इंट्रो",
    contentSections: [{ type: "text" as const, content: "कथा" }],
    featuredImage: { url: "https://example.com/a.jpg", alt: "करवा चौथ" },
    category: category._id.toString(),
    categoryName: category.name,
    tags: [],
    relatedPosts: [],
    seo: {},
    isActive: false,
    ...overrides,
  };
}

describe("createStory", () => {
  it("saves with Active=false and appears Inactive", async () => {
    const input = await baseInput();
    const story = await createStory(input);
    expect(story.isActive).toBe(false);
  });

  it("rejects a duplicate slug", async () => {
    const input = await baseInput();
    await createStory(input);
    await expect(createStory(input)).rejects.toThrow(/already in use/i);
  });

  it("rejects Active=true when an image is missing alt text", async () => {
    const input = await baseInput({
      isActive: true,
      contentSections: [{ type: "image", url: "https://example.com/x.jpg" }],
    });
    await expect(createStory(input)).rejects.toThrow(/alt text/i);
  });
});

describe("updateStory", () => {
  it("toggles an eligible story to Active", async () => {
    const input = await baseInput();
    const story = await createStory(input);
    const updated = await updateStory(story._id.toString(), { ...input, isActive: true });
    expect(updated.isActive).toBe(true);
  });

  it("rejects blanking an already-Active story's image alt text on save", async () => {
    const input = await baseInput({ isActive: true });
    const story = await createStory(input);

    await expect(
      updateStory(story._id.toString(), {
        ...input,
        isActive: true,
        featuredImage: { url: input.featuredImage.url, alt: "" },
      })
    ).rejects.toThrow(/alt text/i);
  });

  it("rejects changing the slug of a currently-Active story", async () => {
    const input = await baseInput({ isActive: true });
    const story = await createStory(input);

    await expect(
      updateStory(story._id.toString(), { ...input, slug: "new-slug", isActive: true })
    ).rejects.toThrow(/deactivate/i);
  });

  it("allows changing the slug once the story is deactivated", async () => {
    const input = await baseInput({ isActive: true });
    const story = await createStory(input);

    await updateStory(story._id.toString(), { ...input, isActive: false });
    const updated = await updateStory(story._id.toString(), {
      ...input,
      slug: "new-slug",
      isActive: false,
    });
    expect(updated.slug).toBe("new-slug");
  });
});

describe("deleteStory", () => {
  it("returns a clear not-found result for a non-existent ID", async () => {
    const { Types } = await import("mongoose");
    const fakeId = new Types.ObjectId().toString();
    await expect(deleteStory(fakeId)).rejects.toThrow(/not found/i);
  });

  it("permanently removes the story", async () => {
    const input = await baseInput();
    const story = await createStory(input);
    await deleteStory(story._id.toString());
    const result = await getStoryById(story._id.toString());
    expect(result).toBeNull();
  });
});
