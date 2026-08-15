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

// Note: the fix that clears the cached connection promise on a failed mongoose.connect()
// (so a transient failure doesn't wedge the warm serverless instance forever) is not
// covered by an automated test here - db.ts's module-level `cache` is captured once at
// import time, so a test can't reset it to force a fresh connection attempt without
// adding a test-only reset hook to the module purely for testability. Verified by code
// inspection and independent confirmation from two code-review passes instead.
