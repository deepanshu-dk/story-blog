import { headers } from "next/headers";
import { connectToDatabase } from "@/lib/db";
import RateLimitAttempt from "@/models/RateLimitAttempt";

const MAX_ATTEMPTS = 5;
const BACKOFF_MINUTES = 15;

/**
 * Extracts the client IP from Vercel's platform-populated forwarded-IP header, not a raw
 * client-supplied header read verbatim. On Vercel, `x-forwarded-for` is set by the
 * platform's edge network for the connecting client and is not attacker-controllable in
 * the way an arbitrary custom header would be - trusting it here (rather than e.g. a
 * client-settable `x-real-ip`) is what keeps every rate limiter in this app from being
 * trivially bypassed by rotating a header value per request.
 */
export async function getClientIp(): Promise<string> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return "unknown";
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

/** Call after a failed attempt (wrong credentials, honeypot triggered, etc.). */
export async function recordFailedAttempt(scope: string, identifier: string): Promise<void> {
  await connectToDatabase();
  const key = `${scope}:${identifier}`;
  const record = await RateLimitAttempt.findOne({ key });

  const count = (record?.count ?? 0) + 1;
  const update: { key: string; count: number; updatedAt: Date; lockedUntil?: Date } = {
    key,
    count,
    updatedAt: new Date(),
  };

  if (count >= MAX_ATTEMPTS) {
    // Exponential backoff: doubles per lockout beyond the threshold.
    const lockoutMultiplier = Math.pow(2, count - MAX_ATTEMPTS);
    update.lockedUntil = new Date(Date.now() + BACKOFF_MINUTES * 60 * 1000 * lockoutMultiplier);
  }

  await RateLimitAttempt.findOneAndUpdate({ key }, update, { upsert: true });
}

/** Call after a successful attempt to reset the counter. */
export async function clearRateLimit(scope: string, identifier: string): Promise<void> {
  await connectToDatabase();
  await RateLimitAttempt.deleteOne({ key: `${scope}:${identifier}` });
}
