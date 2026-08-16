"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markStoryRequestReviewed } from "@/actions/requests";

interface RequestRow {
  _id: string;
  message: string;
  reviewed: boolean;
  createdAt: string;
}

// Explicit locale/timeZone (not the runtime default) so server and client render the same
// string - relying on the default locale caused a hydration mismatch between Node's default
// and the browser's locale.
function formatRequestDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function RequestInbox({ requests }: { requests: RequestRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleMarkReviewed(id: string) {
    startTransition(async () => {
      await markStoryRequestReviewed(id);
      router.refresh();
    });
  }

  if (requests.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
        No story requests yet.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {requests.map((request) => (
        <li
          key={request._id}
          className={`flex items-start justify-between gap-4 rounded-xl border bg-white p-4 shadow-sm ${
            request.reviewed ? "border-neutral-200" : "border-amber-200"
          }`}
        >
          <div>
            <p className="text-sm text-neutral-900">{request.message}</p>
            <p className="mt-1 text-xs text-neutral-500">
              {formatRequestDate(request.createdAt)}
            </p>
          </div>
          {request.reviewed ? (
            <span className="whitespace-nowrap rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-500">
              Reviewed
            </span>
          ) : (
            <button
              disabled={isPending}
              onClick={() => handleMarkReviewed(request._id)}
              className="whitespace-nowrap rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              Mark reviewed
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
