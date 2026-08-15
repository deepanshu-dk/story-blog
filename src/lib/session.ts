import { getIronSession, type IronSession } from "iron-session";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getSessionSecretVersion } from "@/models/SessionConfig";

export interface SessionData {
  isAdmin: boolean;
  sessionSecretVersion: number;
}

const SESSION_TTL_SECONDS = 60 * 60 * 4; // 4 hours - short-lived admin session

function getSessionOptions() {
  const password = process.env.SESSION_SEAL_PASSWORD;
  if (!password) {
    throw new Error("SESSION_SEAL_PASSWORD environment variable is not set");
  }
  return {
    cookieName: "story_blog_admin_session",
    password,
    ttl: SESSION_TTL_SECONDS,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
    },
  };
}

/** For use in Server Actions / Route Handlers (Node runtime) via next/headers cookies(). */
export async function getSession(): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(await cookies(), getSessionOptions());
}

/**
 * For use in proxy.ts (Edge runtime). Verifies the cookie's seal (signature + embedded
 * expiry, both handled internally by iron-session's ttl) without any DB call - Edge
 * runtime cannot run Mongoose. Returns null if the cookie is missing, tampered, or expired.
 */
export async function getEdgeSession(
  request: NextRequest,
  response: NextResponse
): Promise<IronSession<SessionData> | null> {
  try {
    const session = await getIronSession<SessionData>(request, response, getSessionOptions());
    if (!session.isAdmin) {
      return null;
    }
    return session;
  } catch {
    // Tampered or expired seal - iron-session throws on unseal failure.
    return null;
  }
}

/**
 * Node-side admin gate used by every admin Server Action (not just login). Beyond the
 * edge check, this also compares the session's embedded secret version against the live
 * SessionConfig document, so bumping the version (password rotation) invalidates existing
 * sessions on the very next authenticated action - not just at the edge, and without a
 * redeploy (see docs/plans - Key Technical Decisions: Auth).
 */
export async function requireAdminSession(): Promise<IronSession<SessionData>> {
  const session = await getSession();
  if (!session.isAdmin) {
    throw new Error("Unauthorized: no active admin session");
  }

  await connectToDatabase();
  const liveVersion = await getSessionSecretVersion();
  if (session.sessionSecretVersion !== liveVersion) {
    session.destroy();
    throw new Error("Unauthorized: session invalidated by credential rotation");
  }

  return session;
}
