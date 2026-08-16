"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createCategory,
  renameCategory,
  deleteCategory,
  repairCategoryNameDrift,
} from "@/actions/categories";

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
  const [repairMessage, setRepairMessage] = useState<string | null>(null);

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

  function handleRepair(id: string, name: string) {
    setError(null);
    setRepairMessage(null);
    startTransition(async () => {
      try {
        const { driftedCount } = await repairCategoryNameDrift(id);
        setRepairMessage(
          driftedCount > 0
            ? `Fixed ${driftedCount} story(ies) with a stale category name under "${name}".`
            : `No drift found for "${name}".`
        );
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to repair category names");
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
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      {repairMessage && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          {repairMessage}
        </p>
      )}

      <form onSubmit={handleCreate} className="flex gap-2 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New category name"
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
        >
          Add
        </button>
      </form>

      <ul className="space-y-2">
        {categories.length === 0 && (
          <li className="rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
            No categories yet.
          </li>
        )}
        {categories.map((category) => (
          <li
            key={category._id}
            className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
          >
            {renamingId === category._id ? (
              <div className="flex flex-1 gap-2">
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                <button
                  disabled={isPending}
                  onClick={() => handleRename(category._id)}
                  className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  disabled={isPending}
                  onClick={() => setRenamingId(null)}
                  className="rounded-lg px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-100 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <span className="text-sm font-medium text-neutral-900">
                  {category.name}
                  {category.isProtected && (
                    <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-normal text-neutral-500">
                      protected
                    </span>
                  )}
                </span>
                <div className="flex gap-4">
                  <button
                    disabled={isPending}
                    onClick={() => handleRepair(category._id, category.name)}
                    className="text-sm font-medium text-neutral-600 hover:text-amber-700 hover:underline disabled:opacity-50"
                  >
                    Repair
                  </button>
                  {!category.isProtected && (
                    <>
                      <button
                        onClick={() => {
                          setRenamingId(category._id);
                          setRenameValue(category.name);
                        }}
                        className="text-sm font-medium text-neutral-600 hover:text-amber-700 hover:underline"
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => handleDelete(category._id, category.name)}
                        className="text-sm font-medium text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
