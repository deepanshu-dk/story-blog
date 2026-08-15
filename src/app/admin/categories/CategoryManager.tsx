"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCategory, renameCategory, deleteCategory } from "@/actions/categories";

interface CategoryRow {
  _id: string;
  name: string;
  slug: string;
  isProtected?: boolean;
}

export function CategoryManager({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await createCategory(newName.trim());
        setNewName("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create category");
      }
    });
  }

  function handleRename(id: string) {
    if (!renameValue.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await renameCategory(id, renameValue.trim());
        setRenamingId(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to rename category");
      }
    });
  }

  function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? Stories in it move to Uncategorized.`)) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await deleteCategory(id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete category");
      }
    });
  }

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New category name"
          className="flex-1 rounded border border-neutral-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Add
        </button>
      </form>

      <ul className="divide-y divide-neutral-200 rounded border border-neutral-200">
        {categories.length === 0 && (
          <li className="p-4 text-sm text-neutral-500">No categories yet.</li>
        )}
        {categories.map((category) => (
          <li key={category._id} className="flex items-center justify-between gap-3 p-3">
            {renamingId === category._id ? (
              <div className="flex flex-1 gap-2">
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="flex-1 rounded border border-neutral-300 px-2 py-1 text-sm"
                />
                <button
                  onClick={() => handleRename(category._id)}
                  className="text-sm font-medium text-neutral-900"
                >
                  Save
                </button>
                <button
                  onClick={() => setRenamingId(null)}
                  className="text-sm text-neutral-500"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <span className="text-sm text-neutral-900">
                  {category.name}
                  {category.isProtected && (
                    <span className="ml-2 text-xs text-neutral-400">(protected)</span>
                  )}
                </span>
                {!category.isProtected && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setRenamingId(category._id);
                        setRenameValue(category.name);
                      }}
                      className="text-sm text-neutral-600 hover:underline"
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => handleDelete(category._id, category.name)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
