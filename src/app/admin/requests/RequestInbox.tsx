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
    return <p className="text-sm text-neutral-500">No story requests yet.</p>;
  }

  return (
    <ul className="divide-y divide-neutral-200 rounded border border-neutral-200">
      {requests.map((request) => (
        <li key={request._id} className="flex items-start justify-between gap-3 p-3">
          <div>
            <p className="text-sm text-neutral-900">{request.message}</p>
            <p className="text-xs text-neutral-500">
              {new Date(request.createdAt).toLocaleString()}
            </p>
          </div>
          {request.reviewed ? (
            <span className="text-xs text-neutral-400">Reviewed</span>
          ) : (
            <button
              disabled={isPending}
              onClick={() => handleMarkReviewed(request._id)}
              className="whitespace-nowrap text-xs font-medium text-neutral-700 hover:underline disabled:opacity-50"
            >
              Mark reviewed
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
