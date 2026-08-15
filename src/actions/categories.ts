"use server";

import slugify from "slugify";
import { connectToDatabase } from "@/lib/db";
import { requireAdminSession } from "@/lib/session";
import Category, { UNCATEGORIZED_SLUG } from "@/models/Category";
import Post from "@/models/Post";
import { revalidateTags, categoryTag } from "@/lib/cacheTags";
import { toPlain } from "@/lib/serialize";

export async function listCategories() {
  await requireAdminSession();
  await connectToDatabase();
  return Category.find().sort({ name: 1 }).lean();
}

export async function createCategory(name: string) {
  await requireAdminSession();
  await connectToDatabase();
  const slug = slugify(name, { lower: true, strict: true });
  const category = await Category.create({ name, slug });
  return toPlain(category);
}

export async function ensureUncategorizedCategory() {
  await connectToDatabase();
  let category = await Category.findOne({ slug: UNCATEGORIZED_SLUG });
  if (!category) {
    try {
      category = await Category.create({
        name: "Uncategorized",
        slug: UNCATEGORIZED_SLUG,
        isProtected: true,
      });
    } catch (err: unknown) {
      // Two concurrent first-time callers can both find nothing and both attempt to
      // create it; the loser of the race re-fetches the winner's document instead of
      // crashing on the unique-slug constraint.
      if (isDuplicateKeyError(err)) {
        category = await Category.findOne({ slug: UNCATEGORIZED_SLUG });
      } else {
        throw err;
      }
    }
  }
  if (!category) {
    throw new Error("Failed to create or find the Uncategorized category");
  }
  return category;
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: number }).code === 11000
  );
}

export async function renameCategory(categoryId: string, newName: string) {
  await requireAdminSession();
  await connectToDatabase();

  const category = await Category.findById(categoryId);
  if (!category) {
    throw new Error("Category not found");
  }

  const previousName = category.name;
  category.name = newName;
  await category.save();

  // Re-sync the denormalized categoryName on every Post referencing this category.
  await Post.updateMany({ category: category._id }, { categoryName: newName });

  await revalidateTags([categoryTag(previousName), categoryTag(newName)]);

  return toPlain(category);
}

/**
 * Idempotent repair check: compares each Post's denormalized categoryName against its
 * referenced category's current name, and re-syncs any drifted documents. Safe to re-run
 * manually if a rename's updateMany was interrupted mid-batch (see docs/plans - Key
 * Technical Decisions).
 */
export async function repairCategoryNameDrift(categoryId: string) {
  await requireAdminSession();
  await connectToDatabase();

  const category = await Category.findById(categoryId);
  if (!category) {
    throw new Error("Category not found");
  }

  const driftedCount = await Post.countDocuments({
    category: category._id,
    categoryName: { $ne: category.name },
  });

  if (driftedCount > 0) {
    await Post.updateMany({ category: category._id }, { categoryName: category.name });
  }

  return { driftedCount };
}

export async function deleteCategory(categoryId: string) {
  await requireAdminSession();
  await connectToDatabase();

  const category = await Category.findById(categoryId);
  if (!category) {
    throw new Error("Category not found");
  }
  if (category.isProtected) {
    throw new Error("The Uncategorized category cannot be deleted");
  }

  const uncategorized = await ensureUncategorizedCategory();

  const affectedCount = await Post.countDocuments({ category: category._id });

  // Reassign first, verify the reassignment covered every referencing post, and only
  // then delete the category - never the reverse (see docs/plans - Key Technical
  // Decisions: Category deletion).
  const reassignResult = await Post.updateMany(
    { category: category._id },
    { category: uncategorized._id, categoryName: uncategorized.name }
  );

  if (reassignResult.modifiedCount < affectedCount) {
    throw new Error(
      `Reassignment covered ${reassignResult.modifiedCount}/${affectedCount} posts - aborting delete`
    );
  }

  await Category.deleteOne({ _id: category._id });

  await revalidateTags([categoryTag(category.name), categoryTag(uncategorized.name)]);

  return { reassignedCount: reassignResult.modifiedCount };
}
