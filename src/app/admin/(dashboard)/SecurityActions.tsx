"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { invalidateAllSessions } from "@/actions/auth";

export function SecurityActions() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleInvalidate() {
    const confirmed = window.confirm(
      "This logs out every admin session, including this one - you'll need to log in again. Continue?"
    );
    if (!confirmed) return;

    startTransition(async () => {
      await invalidateAllSessions();
      setMessage("All sessions invalidated. Redirecting to login...");
      router.push("/admin/login");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-500">
        Logs out every admin session everywhere, including this one, if credentials may be compromised.
      </p>
      {message && <p className="text-sm font-medium text-amber-700">{message}</p>}
      <button
        disabled={isPending}
        onClick={handleInvalidate}
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
      >
        Invalidate all admin sessions
      </button>
    </div>
  );
}
