import { describe, it, expect, afterAll } from "vitest";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";

afterAll(async () => {
  await mongoose.disconnect();
});

describe("connectToDatabase", () => {
  it("reuses the cached connection on a second call rather than opening a new one", async () => {
    const first = await connectToDatabase();
    const second = await connectToDatabase();
    expect(second).toBe(first);
  });
});
