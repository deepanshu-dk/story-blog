import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { connectTestDb, disconnectTestDb, clearTestDb } from "@/lib/__tests__/testDb";

vi.mock("@/lib/session", () => ({
  requireAdminSession: vi.fn().mockResolvedValue({ isAdmin: true }),
}));
vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
  updateTag: vi.fn(),
}));

const { getDashboardStats } = await import("@/actions/stories");
const { submitStoryRequest, listStoryRequests, markStoryRequestReviewed } = await import(
  "@/actions/requests"
);
const { default: Post } = await import("@/models/Post");
const { default: Category } = await import("@/models/Category");

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.30" }),
}));

beforeAll(async () => {
  await connectTestDb();
});

afterAll(async () => {
  await disconnectTestDb();
});

beforeEach(async () => {
  await clearTestDb();
});

describe("getDashboardStats", () => {
  it("renders zero-state counts for an empty collection", async () => {
    const stats = await getDashboardStats();
    expect(stats).toEqual({ total: 0, active: 0, inactive: 0, mostViewed: [] });
  });

  it("matches the actual counts in the database", async () => {
    const category = await Category.create({ name: "Vrat Katha", slug: "vrat-katha" });
    await Post.create({
      slug: "active-1",
      title: "T1",
      intro: "I",
      featuredImage: { url: "https://example.com/a.jpg", alt: "a" },
      category: category._id,
      categoryName: category.name,
      isActive: true,
    });
    await Post.create({
      slug: "inactive-1",
      title: "T2",
      intro: "I",
      featuredImage: { url: "https://example.com/a.jpg", alt: "a" },
      category: category._id,
      categoryName: category.name,
      isActive: false,
    });

    const stats = await getDashboardStats();
    expect(stats.total).toBe(2);
    expect(stats.active).toBe(1);
    expect(stats.inactive).toBe(1);
  });
});

describe("markStoryRequestReviewed", () => {
  it("persists and is reflected on next load", async () => {
    await submitStoryRequest("तीज व्रत कथा चाहिए", "");
    const [request] = await listStoryRequests();

    await markStoryRequestReviewed(request._id.toString());

    const [reloaded] = await listStoryRequests();
    expect(reloaded.reviewed).toBe(true);
  });
});
