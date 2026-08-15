import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequireAdminSession = vi.fn();
vi.mock("@/lib/session", () => ({
  requireAdminSession: () => mockRequireAdminSession(),
}));

process.env.CLOUDINARY_API_SECRET = "test-secret";

const { POST } = await import("@/app/api/cloudinary/sign/route");

beforeEach(() => {
  mockRequireAdminSession.mockReset();
});

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/cloudinary/sign", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/cloudinary/sign", () => {
  it("returns a signature for an authenticated admin request", async () => {
    mockRequireAdminSession.mockResolvedValue({ isAdmin: true });

    const response = await POST(
      makeRequest({ paramsToSign: { timestamp: 1234567890, folder: "stories" } })
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(typeof json.signature).toBe("string");
    expect(json.signature.length).toBeGreaterThan(0);
  });

  it("rejects an unauthenticated request with 401", async () => {
    mockRequireAdminSession.mockRejectedValue(new Error("no session"));

    const response = await POST(makeRequest({ paramsToSign: { timestamp: 1234567890 } }));
    expect(response.status).toBe(401);
  });
});
