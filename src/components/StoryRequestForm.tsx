"use client";

import { useState, useTransition } from "react";
import { submitStoryRequest } from "@/actions/requests";

export function StoryRequestForm() {
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await submitStoryRequest(message, honeypot);
      if (result.success) {
        setStatus("sent");
        setMessage("");
      } else {
        setStatus("error");
        setError(result.error ?? "Something went wrong.");
      }
    });
  }

  if (status === "sent") {
    return (
      <p className="rounded bg-green-50 p-4 text-sm text-green-800">
        धन्यवाद! आपका सुझाव मिल गया है।
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg bg-amber-100 p-4">
      <h2 className="text-base font-semibold text-amber-900">
        क्या आपको यह कथा पसंद आई?
      </h2>
      <p className="text-sm text-neutral-700">
        अगर हाँ, तो आप अगली कौन-सी कहानी पढ़ना चाहते हैं?
      </p>

      {error && <p className="text-sm text-red-700">{error}</p>}

      {/* Hidden honeypot field - real readers never see or fill this. */}
      <input
        type="text"
        name="website"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        className="absolute -left-[9999px]"
        aria-hidden="true"
      />

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={2}
        maxLength={500}
        placeholder="जैसे: तीज व्रत कथा"
        className="w-full rounded border border-amber-300 px-3 py-2 text-sm"
      />

      <button
        type="submit"
        disabled={isPending || !message.trim()}
        className="rounded bg-amber-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? "भेज रहे हैं..." : "सुझाव भेजें"}
      </button>
    </form>
  );
}
