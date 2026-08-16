import { listCategories } from "@/actions/categories";
import { listStories } from "@/actions/stories";
import { StoryForm } from "../StoryForm";

export const dynamic = "force-dynamic";

export default async function NewStoryPage() {
  const [categoriesRaw, storiesRaw] = await Promise.all([listCategories(), listStories()]);

  const categories = categoriesRaw.map((c) => ({ _id: c._id.toString(), name: c.name }));
  const relatedOptions = storiesRaw.map((s) => ({
    _id: s._id.toString(),
    title: s.title,
  }));

  return (
    <StoryForm categories={categories} relatedOptions={relatedOptions} />
  );
}
