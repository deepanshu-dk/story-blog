import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { connectTestDb, disconnectTestDb, clearTestDb } from "@/lib/__tests__/testDb";
import { recordFailedAttempt, checkRateLimit } from "@/lib/rateLimit";
import RateLimitAttempt from "@/models/RateLimitAttempt";

beforeAll(async () => {
  await connectTestDb();
});

afterAll(async () => {
  await disconnectTestDb();
});

beforeEach(async () => {
  await clearTestDb();
});

describe("recordFailedAttempt", () => {
  it("counts every concurrent attempt via atomic $inc, without lost updates from a read-then-write race", async () => {
    const scope = "test-scope";
    const identifier = "203.0.113.99";

    await Promise.all(
      Array.from({ length: 10 }, () => recordFailedAttempt(scope, identifier))
    );

    const record = await RateLimitAttempt.findOne({ key: `${scope}:${identifier}` });
    expect(record?.count).toBe(10);
  });

  it("locks out further attempts once the count crosses the threshold", async () => {
    const scope = "test-scope";
    const identifier = "203.0.113.98";

    for (let i = 0; i < 5; i++) {
      await recordFailedAttempt(scope, identifier);
    }

    const result = await checkRateLimit(scope, identifier);
    expect(result.allowed).toBe(false);
  });
});
