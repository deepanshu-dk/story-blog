import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { connectTestDb, disconnectTestDb, clearTestDb } from "@/lib/__tests__/testDb";

let requestHeaders = new Headers({ "x-real-ip": "203.0.113.20" });
vi.mock("next/headers", () => ({
  headers: async () => requestHeaders,
}));

const { submitStoryRequest, listStoryRequests } = await import("@/actions/requests");

vi.mock("@/lib/session", () => ({
  requireAdminSession: vi.fn().mockResolvedValue({ isAdmin: true }),
}));

beforeAll(async () => {
  await connectTestDb();
});

afterAll(async () => {
  await disconnectTestDb();
});

beforeEach(async () => {
  await clearTestDb();
  requestHeaders = new Headers({ "x-real-ip": "203.0.113.20" });
});

describe("submitStoryRequest", () => {
  it("persists a normal submission with the honeypot empty", async () => {
    const result = await submitStoryRequest("तीज व्रत कथा चाहिए", "");
    expect(result.success).toBe(true);

    const requests = await listStoryRequests();
    expect(requests).toHaveLength(1);
    expect(requests[0].message).toBe("तीज व्रत कथा चाहिए");
    expect(requests[0].reviewed).toBe(false);
  });

  it("silently discards a submission with the honeypot filled, without a DB write", async () => {
    const result = await submitStoryRequest("spam message", "http://spam.example");
    expect(result.success).toBe(true);

    const requests = await listStoryRequests();
    expect(requests).toHaveLength(0);
  });

  it("rejects a message exceeding the max length", async () => {
    const result = await submitStoryRequest("अ".repeat(501), "");
    expect(result.success).toBe(false);

    const requests = await listStoryRequests();
    expect(requests).toHaveLength(0);
  });

  it("rejects repeated submissions from the same IP beyond the rate limit", async () => {
    for (let i = 0; i < 5; i++) {
      await submitStoryRequest("अ".repeat(501), ""); // each counts as a failed attempt
    }
    const result = await submitStoryRequest("valid message", "");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/too many requests/i);
  });

  it("throttles a flood of valid-length accepted submissions too, not just rejected ones", async () => {
    for (let i = 0; i < 5; i++) {
      const result = await submitStoryRequest(`valid message ${i}`, "");
      expect(result.success).toBe(true);
    }

    const result = await submitStoryRequest("one more valid message", "");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/too many requests/i);
  });
});
