"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import slugify from "slugify";
import { createStory, updateStory, deleteStory } from "@/actions/stories";
import { ImageUploadField, type UploadedImage } from "@/components/ImageUploadField";
import type { ContentSection, StorySeo } from "@/types/story";

interface CategoryOption {
  _id: string;
  name: string;
}

interface RelatedOption {
  _id: string;
  title: string;
}

export interface StoryFormValues {
  _id?: string;
  slug: string;
  title: string;
  intro: string;
  contentSections: ContentSection[];
  featuredImage: UploadedImage | null;
  category: string;
  tags: string;
  relatedPosts: string[];
  seo: StorySeo;
  isActive: boolean;
}

const EMPTY_STORY: StoryFormValues = {
  slug: "",
  title: "",
  intro: "",
  contentSections: [],
  featuredImage: null,
  category: "",
  tags: "",
  relatedPosts: [],
  seo: {},
  isActive: false,
};

export function StoryForm({
  initial,
  categories,
  relatedOptions,
}: {
  initial?: StoryFormValues;
  categories: CategoryOption[];
  relatedOptions: RelatedOption[];
}) {
  const router = useRouter();
  const isEditing = Boolean(initial?._id);
  const wasActiveOnLoad = initial?.isActive ?? false;

  const [values, setValues] = useState<StoryFormValues>(initial ?? EMPTY_STORY);
  const [slugTouched, setSlugTouched] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleTitleChange(title: string) {
    setValues((v) => ({
      ...v,
      title,
      slug: slugTouched ? v.slug : slugify(title, { lower: true, strict: true }),
    }));
  }

  function addSection(type: "text" | "image") {
    setValues((v) => ({
      ...v,
      contentSections: [...v.contentSections, { type }],
    }));
  }

  function updateSection(index: number, patch: Partial<ContentSection>) {
    setValues((v) => ({
      ...v,
      contentSections: v.contentSections.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));
  }

  function removeSection(index: number) {
    setValues((v) => ({
      ...v,
      contentSections: v.contentSections.filter((_, i) => i !== index),
    }));
  }

  function moveSection(index: number, direction: -1 | 1) {
    setValues((v) => {
      const next = [...v.contentSections];
      const target = index + direction;
      if (target < 0 || target >= next.length) return v;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...v, contentSections: next };
    });
  }

  function buildInput(isActive: boolean) {
    const category = categories.find((c) => c._id === values.category);
    if (!values.featuredImage) {
      throw new Error("A featured image is required");
    }
    if (!category) {
      throw new Error("Please choose a category");
    }
    return {
      slug: values.slug,
      title: values.title,
      intro: values.intro,
      contentSections: values.contentSections,
      featuredImage: values.featuredImage,
      category: category._id,
      categoryName: category.name,
      tags: values.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      relatedPosts: values.relatedPosts,
      seo: values.seo,
      isActive,
    };
  }

  function handleSave(isActive: boolean) {
    setError(null);
    startTransition(async () => {
      try {
        const input = buildInput(isActive);
        if (isEditing && initial?._id) {
          await updateStory(initial._id, input);
        } else {
          await createStory(input);
        }
        router.push("/admin/stories");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save story");
      }
    });
  }

  function handleDelete() {
    if (!initial?._id) return;
    const confirmed = window.confirm(
      `Permanently delete "${values.title}"? This cannot be undone.`
    );
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      try {
        await deleteStory(initial._id!);
        router.push("/admin/stories");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete story");
      }
    });
  }

  const slugLocked = isEditing && wasActiveOnLoad;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {error && (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="space-y-1">
        <label className="block text-sm font-medium text-neutral-700">Title</label>
        <input
          value={values.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-neutral-700">
          Slug {slugLocked && <span className="text-xs text-neutral-400">(deactivate to change)</span>}
        </label>
        <input
          value={values.slug}
          disabled={slugLocked}
          onChange={(e) => {
            setSlugTouched(true);
            setValues((v) => ({ ...v, slug: e.target.value }));
          }}
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm disabled:bg-neutral-100"
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-neutral-700">Introduction</label>
        <textarea
          value={values.intro}
          onChange={(e) => setValues((v) => ({ ...v, intro: e.target.value }))}
          rows={3}
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      <ImageUploadField
        label="Featured image"
        required
        value={values.featuredImage}
        onChange={(image) => setValues((v) => ({ ...v, featuredImage: image }))}
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-neutral-700">Content sections</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => addSection("text")}
              className="rounded border border-neutral-300 px-2 py-1 text-xs"
            >
              + Text
            </button>
            <button
              type="button"
              onClick={() => addSection("image")}
              className="rounded border border-neutral-300 px-2 py-1 text-xs"
            >
              + Image
            </button>
          </div>
        </div>

        <ul className="space-y-3">
          {values.contentSections.map((section, index) => (
            <li key={index} className="rounded border border-neutral-200 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-500">
                <span>{section.type === "text" ? "Text" : "Image"} section</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => moveSection(index, -1)}>
                    ↑
                  </button>
                  <button type="button" onClick={() => moveSection(index, 1)}>
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSection(index)}
                    className="text-red-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
              {section.type === "text" ? (
                <textarea
                  value={section.content ?? ""}
                  onChange={(e) => updateSection(index, { content: e.target.value })}
                  rows={3}
                  className="w-full rounded border border-neutral-300 px-2 py-1 text-sm"
                />
              ) : (
                <ImageUploadField
                  label=""
                  required
                  value={section.url ? { url: section.url, alt: section.alt ?? "" } : null}
                  onChange={(image) =>
                    updateSection(index, { url: image?.url, alt: image?.alt })
                  }
                />
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-neutral-700">Category</label>
        <select
          value={values.category}
          onChange={(e) => setValues((v) => ({ ...v, category: e.target.value }))}
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="">Select a category</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-neutral-700">Tags (comma-separated)</label>
        <input
          value={values.tags}
          onChange={(e) => setValues((v) => ({ ...v, tags: e.target.value }))}
          className="w-full rounded border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <span className="block text-sm font-medium text-neutral-700">Related stories</span>
        <div className="max-h-32 space-y-1 overflow-y-auto rounded border border-neutral-200 p-2">
          {relatedOptions.map((option) => (
            <label key={option._id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={values.relatedPosts.includes(option._id)}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    relatedPosts: e.target.checked
                      ? [...v.relatedPosts, option._id]
                      : v.relatedPosts.filter((id) => id !== option._id),
                  }))
                }
              />
              {option.title}
            </label>
          ))}
        </div>
      </div>

      <details className="rounded border border-neutral-200 p-3">
        <summary className="cursor-pointer text-sm font-medium text-neutral-700">
          SEO fields
        </summary>
        <div className="mt-3 space-y-3">
          {(
            [
              ["title", "SEO title"],
              ["metaDescription", "Meta description"],
              ["canonicalUrl", "Canonical URL"],
              ["ogTitle", "OG title"],
              ["ogDescription", "OG description"],
              ["ogImage", "OG image URL"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-1">
              <label className="block text-xs font-medium text-neutral-600">{label}</label>
              <input
                value={values.seo[key] ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, seo: { ...v.seo, [key]: e.target.value } }))
                }
                className="w-full rounded border border-neutral-300 px-2 py-1 text-sm"
              />
            </div>
          ))}
        </div>
      </details>

      <div className="flex items-center justify-between border-t border-neutral-200 pt-4">
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleSave(false)}
            className="rounded border border-neutral-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            Save as draft
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleSave(true)}
            className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {values.isActive ? "Save" : "Publish"}
          </button>
        </div>
        {isEditing && (
          <button
            type="button"
            disabled={isPending}
            onClick={handleDelete}
            className="text-sm font-medium text-red-600 disabled:opacity-50"
          >
            Delete story
          </button>
        )}
      </div>
    </div>
  );
}
