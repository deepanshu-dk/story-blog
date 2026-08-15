import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { connectTestDb, disconnectTestDb, clearTestDb } from "@/lib/__tests__/testDb";

// In-memory cookie jar + header store shared across next/headers mock calls, simulating
// a single request/response cycle per test.
const cookieJar = new Map<string, string>();
let requestHeaders = new Headers();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieJar.get(name);
      return value ? { name, value } : undefined;
    },
    set: (nameOrOptions: string | { name: string; value: string }, value?: string) => {
      if (typeof nameOrOptions === "string") {
        cookieJar.set(nameOrOptions, value ?? "");
      } else {
        cookieJar.set(nameOrOptions.name, nameOrOptions.value);
      }
    },
  }),
  headers: async () => requestHeaders,
}));

process.env.SESSION_SEAL_PASSWORD = "a".repeat(32);
process.env.ADMIN_USERNAME = "admin";
process.env.ADMIN_PASSWORD = "correct-horse-battery-staple";

const { login, logout, invalidateAllSessions } = await import("@/actions/auth");
const { getSession } = await import("@/lib/session");

beforeAll(async () => {
  await connectTestDb();
});

afterAll(async () => {
  await disconnectTestDb();
});

beforeEach(async () => {
  await clearTestDb();
  cookieJar.clear();
  requestHeaders = new Headers({ "x-real-ip": "203.0.113.10" });
});

describe("login", () => {
  it("issues a valid session for correct credentials", async () => {
    const result = await login("admin", "correct-horse-battery-staple");
    expect(result.success).toBe(true);

    const session = await getSession();
    expect(session.isAdmin).toBe(true);
  });

  it("returns an identical generic error for wrong username vs wrong password", async () => {
    const wrongUsername = await login("someone-else", "correct-horse-battery-staple");
    cookieJar.clear();
    const wrongPassword = await login("admin", "wrong-password");

    expect(wrongUsername.success).toBe(false);
    expect(wrongPassword.success).toBe(false);
    expect(wrongUsername.error).toBe(wrongPassword.error);
  });

  it("does not issue a session on incorrect credentials", async () => {
    await login("admin", "wrong-password");
    const session = await getSession();
    expect(session.isAdmin).toBeUndefined();
  });

  it("blocks further attempts after repeated failures from one IP", async () => {
    for (let i = 0; i < 5; i++) {
      await login("admin", "wrong-password");
    }
    const result = await login("admin", "correct-horse-battery-staple");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/too many attempts/i);
  });

  it("throws rather than failing open when ADMIN_USERNAME/ADMIN_PASSWORD are unset", async () => {
    const savedUsername = process.env.ADMIN_USERNAME;
    const savedPassword = process.env.ADMIN_PASSWORD;
    delete process.env.ADMIN_USERNAME;
    delete process.env.ADMIN_PASSWORD;

    await expect(login("", "")).rejects.toThrow(/ADMIN_USERNAME/);

    process.env.ADMIN_USERNAME = savedUsername;
    process.env.ADMIN_PASSWORD = savedPassword;
  });

  it("invalidates a previously-issued session after invalidateAllSessions() bumps the version", async () => {
    await login("admin", "correct-horse-battery-staple");
    const { requireAdminSession } = await import("@/lib/session");
    await expect(requireAdminSession()).resolves.toBeDefined();

    await invalidateAllSessions();

    await expect(requireAdminSession()).rejects.toThrow(/invalidated/i);
  });
});

describe("logout", () => {
  it("clears the session", async () => {
    await login("admin", "correct-horse-battery-staple");
    await logout();
    const session = await getSession();
    expect(session.isAdmin).toBeUndefined();
  });
});
