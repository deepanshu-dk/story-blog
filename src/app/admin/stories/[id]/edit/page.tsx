import { notFound } from "next/navigation";
import { listCategories } from "@/actions/categories";
import { getStoryById, listStories } from "@/actions/stories";
import { StoryForm, type StoryFormValues } from "../../StoryForm";

export const dynamic = "force-dynamic";

export default async function EditStoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [story, categoriesRaw, storiesRaw] = await Promise.all([
    getStoryById(id),
    listCategories(),
    listStories(),
  ]);

  if (!story) {
    notFound();
  }

  const categories = categoriesRaw.map((c) => ({ _id: c._id.toString(), name: c.name }));
  const relatedOptions = storiesRaw
    .filter((s) => s._id.toString() !== id)
    .map((s) => ({ _id: s._id.toString(), title: s.title }));

  const initial: StoryFormValues = {
    _id: story._id.toString(),
    slug: story.slug,
    title: story.title,
    intro: story.intro,
    contentSections: (story.contentSections ?? []).map((section) => ({
      type: section.type,
      content: section.content ?? undefined,
      url: section.url ?? undefined,
      alt: section.alt ?? undefined,
      caption: section.caption ?? undefined,
    })),
    featuredImage: {
      url: story.featuredImage.url,
      alt: story.featuredImage.alt ?? "",
      caption: story.featuredImage.caption ?? undefined,
    },
    category: story.category.toString(),
    tags: (story.tags ?? []).join(", "),
    relatedPosts: (story.relatedPosts ?? []).map((p: { toString(): string }) => p.toString()),
    seo: {
      title: story.seo?.title ?? undefined,
      metaDescription: story.seo?.metaDescription ?? undefined,
      canonicalUrl: story.seo?.canonicalUrl ?? undefined,
      ogTitle: story.seo?.ogTitle ?? undefined,
      ogDescription: story.seo?.ogDescription ?? undefined,
      ogImage: story.seo?.ogImage ?? undefined,
    },
    isActive: story.isActive,
  };

  return (
    <StoryForm initial={initial} categories={categories} relatedOptions={relatedOptions} />
  );
}
