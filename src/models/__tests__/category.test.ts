import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { connectTestDb, disconnectTestDb, clearTestDb } from "@/lib/__tests__/testDb";
import Category, { UNCATEGORIZED_SLUG } from "@/models/Category";

beforeAll(async () => {
  await connectTestDb();
});

afterAll(async () => {
  await disconnectTestDb();
});

beforeEach(async () => {
  await clearTestDb();
});

describe("Category model", () => {
  it("creates and enforces unique slugs", async () => {
    await Category.create({ name: "Teej", slug: "teej" });
    await expect(Category.create({ name: "Teej 2", slug: "teej" })).rejects.toMatchObject({
      code: 11000,
    });
  });

  it("seeds an Uncategorized category marked protected", async () => {
    const uncategorized = await Category.create({
      name: "Uncategorized",
      slug: UNCATEGORIZED_SLUG,
      isProtected: true,
    });
    expect(uncategorized.isProtected).toBe(true);
  });
});
