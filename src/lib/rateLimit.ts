import { headers } from "next/headers";
import { IP_HEADER_NAME } from "@vercel/functions/headers";
import { connectToDatabase } from "@/lib/db";
import RateLimitAttempt from "@/models/RateLimitAttempt";

const MAX_ATTEMPTS = 5;
const BACKOFF_MINUTES = 15;

/**
 * Reads the platform-set `x-real-ip` header directly (the same header Vercel's official
 * `ipAddress()` helper reads - `IP_HEADER_NAME` is exported from `@vercel/functions` for
 * exactly this), rather than manually parsing `x-forwarded-for`. Vercel's docs state it
 * overwrites `x-forwarded-for` for direct deployments (no attacker-controlled entries
 * survive), but that guarantee only holds without a third-party reverse proxy in front of
 * the deployment - parsing position (first vs. last) in that header is not a reliable
 * trust signal either way.
 *
 * `ipAddress()` itself is not used here: it duck-types its input as `"headers" in input ?
 * input.headers : input`, and Next.js's `headers()` return value is a dynamic-tracking
 * Proxy whose `has` trap makes `"headers" in headerList` evaluate true for any property
 * name - `ipAddress()` then reads the (nonexistent) `.headers` property and crashes with
 * "headers.get is not a function". Reading the header directly sidesteps that.
 */
export async function getClientIp(): Promise<string> {
  const headerList = await headers();
  return headerList.get(IP_HEADER_NAME) ?? "unknown";
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
}

/** Shared by login (U4) and story-request submission (U10) so extraction logic doesn't drift. */
export async function checkRateLimit(scope: string, identifier: string): Promise<RateLimitResult> {
  await connectToDatabase();
  const key = `${scope}:${identifier}`;
  const now = new Date();

  const record = await RateLimitAttempt.findOne({ key });
  if (record?.lockedUntil && record.lockedUntil > now) {
    return { allowed: false, retryAfterMs: record.lockedUntil.getTime() - now.getTime() };
  }

  return { allowed: true };
}

/**
 * Records an attempt (call on every processed request - failed login, honeypot trip,
 * oversized message, or a normal accepted submission that should still count toward the
 * flood limit). Uses an atomic `$inc` rather than read-then-write, so concurrent requests
 * from the same IP can't race past each other and undercount toward the lockout threshold.
 */
export async function recordFailedAttempt(scope: string, identifier: string): Promise<void> {
  await connectToDatabase();
  const key = `${scope}:${identifier}`;

  const updated = await RateLimitAttempt.findOneAndUpdate(
    { key },
    { $inc: { count: 1 }, $set: { updatedAt: new Date() } },
    { upsert: true, returnDocument: "after" }
  );

  if (updated.count >= MAX_ATTEMPTS) {
    // Exponential backoff: doubles per lockout beyond the threshold.
    const lockoutMultiplier = Math.pow(2, updated.count - MAX_ATTEMPTS);
    const lockedUntil = new Date(Date.now() + BACKOFF_MINUTES * 60 * 1000 * lockoutMultiplier);
    await RateLimitAttempt.updateOne({ key }, { $set: { lockedUntil } });
  }
}

/** Call after a successful attempt to reset the counter. */
export async function clearRateLimit(scope: string, identifier: string): Promise<void> {
  await connectToDatabase();
  await RateLimitAttempt.deleteOne({ key: `${scope}:${identifier}` });
}
