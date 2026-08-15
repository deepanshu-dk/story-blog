"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { getSession } from "@/lib/session";
import { getClientIp, checkRateLimit, recordFailedAttempt, clearRateLimit } from "@/lib/rateLimit";
import { connectToDatabase } from "@/lib/db";
import { getSessionSecretVersion, bumpSessionSecretVersion } from "@/models/SessionConfig";

const RATE_LIMIT_SCOPE = "login";
const GENERIC_ERROR = "Invalid username or password.";

/**
 * Constant-time string comparison. Raw crypto.timingSafeEqual requires equal-length
 * buffers, so both inputs are first hashed to a fixed-length digest - this also means
 * comparing a correct vs. incorrect value of any length takes the same time, closing the
 * length-leak side channel a naive `===` (or a naive timingSafeEqual on raw strings) would
 * otherwise have.
 */
function safeCompare(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

export interface LoginResult {
  success: boolean;
  error?: string;
}

export async function login(username: string, password: string): Promise<LoginResult> {
  const ip = await getClientIp();

  const rateLimit = await checkRateLimit(RATE_LIMIT_SCOPE, ip);
  if (!rateLimit.allowed) {
    return { success: false, error: "Too many attempts. Please try again later." };
  }

  const adminUsername = process.env.ADMIN_USERNAME ?? "";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "";

  const usernameMatches = safeCompare(username, adminUsername);
  const passwordMatches = safeCompare(password, adminPassword);

  if (!usernameMatches || !passwordMatches) {
    await recordFailedAttempt(RATE_LIMIT_SCOPE, ip);
    return { success: false, error: GENERIC_ERROR };
  }

  await clearRateLimit(RATE_LIMIT_SCOPE, ip);

  await connectToDatabase();
  const sessionSecretVersion = await getSessionSecretVersion();

  const session = await getSession();
  session.isAdmin = true;
  session.sessionSecretVersion = sessionSecretVersion;
  await session.save();

  return { success: true };
}

export async function logout(): Promise<void> {
  const session = await getSession();
  session.destroy();
}

/** Rotates the session-secret version, invalidating every existing admin session. */
export async function invalidateAllSessions(): Promise<void> {
  await connectToDatabase();
  await bumpSessionSecretVersion();
}
