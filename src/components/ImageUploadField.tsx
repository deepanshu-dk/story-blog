"use client";

import { useState } from "react";
import { CldUploadWidget } from "next-cloudinary";
import type { StoryImage } from "@/types/story";

export type UploadedImage = StoryImage;

interface ImageUploadFieldProps {
  label: string;
  value: UploadedImage | null;
  onChange: (value: UploadedImage | null) => void;
  required?: boolean;
}

type UploadState = "idle" | "uploading" | "success" | "error";

/**
 * Wraps CldUploadWidget's signed-upload flow with explicit in-progress / failure+retry /
 * success states and a required alt-text field, so an admin can tell what's happening
 * during an upload rather than guessing (see docs/plans - U5 Approach).
 */
export function ImageUploadField({ label, value, onChange, required }: ImageUploadFieldProps) {
  const [state, setState] = useState<UploadState>(value ? "success" : "idle");
  // Tracked independently of `value` so alt text typed before an image URL exists (e.g.
  // while an upload is still in flight) isn't silently discarded - it's merged in once
  // the upload completes.
  const [pendingAlt, setPendingAlt] = useState(value?.alt ?? "");

  function handleAltChange(alt: string) {
    setPendingAlt(alt);
    if (value) {
      onChange({ ...value, alt });
    }
  }

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-neutral-700">{label}</span>

      {value?.url && (
        <img
          src={value.url}
          alt={value.alt || "Preview"}
          className="h-32 w-32 rounded object-cover"
        />
      )}

      <CldUploadWidget
        signatureEndpoint="/api/cloudinary/sign"
        onOpen={() => setState("uploading")}
        onError={() => setState("error")}
        onSuccess={(result) => {
          const info = result.info;
          if (info && typeof info === "object" && "secure_url" in info) {
            onChange({ url: info.secure_url as string, alt: pendingAlt });
            setState("success");
          }
        }}
      >
        {({ open }) => (
          <button
            type="button"
            onClick={() => open()}
            className="rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
          >
            {value ? "Replace image" : "Upload image"}
          </button>
        )}
      </CldUploadWidget>

      {state === "uploading" && (
        <p className="text-sm text-neutral-500">Uploading&hellip;</p>
      )}
      {state === "error" && (
        <p className="text-sm text-red-600">
          Upload failed.{" "}
          <button
            type="button"
            onClick={() => setState("idle")}
            className="underline"
          >
            Retry
          </button>
        </p>
      )}

      <div className="space-y-1">
        <label className="block text-xs font-medium text-neutral-600">
          Alt text {required && <span className="text-red-600">*</span>}
        </label>
        <input
          type="text"
          required={required}
          value={value?.alt ?? pendingAlt}
          onChange={(e) => handleAltChange(e.target.value)}
          className="w-full rounded border border-neutral-300 px-2 py-1 text-sm focus:border-neutral-500 focus:outline-none"
          placeholder="Describe the image for screen readers and SEO"
        />
      </div>
    </div>
  );
}
