"use server";

import { connectToDatabase } from "@/lib/db";
import { requireAdminSession } from "@/lib/session";
import { getClientIp, checkRateLimit, recordFailedAttempt } from "@/lib/rateLimit";
import StoryRequest from "@/models/StoryRequest";

const RATE_LIMIT_SCOPE = "story-request";

export interface SubmitStoryRequestResult {
  success: boolean;
  error?: string;
}

/**
 * `honeypot` is a hidden form field real readers never fill in; a non-empty value means a
 * bot filled every field indiscriminately. Submissions tripping it are silently discarded
 * (no error surfaced to the likely-bot submitter, no DB write) rather than rejected loudly -
 * see docs/plans - U10 Approach.
 */
export async function submitStoryRequest(
  message: string,
  honeypot: string
): Promise<SubmitStoryRequestResult> {
  if (honeypot) {
    return { success: true };
  }

  const ip = await getClientIp();
  const rateLimit = await checkRateLimit(RATE_LIMIT_SCOPE, ip);
  if (!rateLimit.allowed) {
    return { success: false, error: "Too many requests. Please try again later." };
  }

  const trimmed = message.trim();
  if (!trimmed) {
    return { success: false, error: "Please write a message." };
  }
  if (trimmed.length > 500) {
    await recordFailedAttempt(RATE_LIMIT_SCOPE, ip);
    return { success: false, error: "Message is too long." };
  }

  await connectToDatabase();
  await StoryRequest.create({ message: trimmed });

  return { success: true };
}

export async function listStoryRequests() {
  await requireAdminSession();
  await connectToDatabase();
  return StoryRequest.find().sort({ createdAt: -1 }).lean();
}

export async function markStoryRequestReviewed(id: string) {
  await requireAdminSession();
  await connectToDatabase();
  await StoryRequest.updateOne({ _id: id }, { reviewed: true });
}
