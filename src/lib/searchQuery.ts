/**
 * Builds a case-insensitive substring match across title/tags/categoryName. MongoDB's
 * $text operator only matches whole words/stems - typing a partial word (e.g. "raks"
 * while typing "raksha") returns zero results even when the full word exists, which reads
 * as broken search to a reader who naturally types incrementally or doesn't finish a
 * word. Regex substring matching is what people actually expect from a search box, and at
 * this scale (hundreds to low-thousands of posts) it's simple and fast enough - no need
 * for a dedicated search engine.
 */
export function buildSearchQuery(rawQuery: string): Record<string, unknown> {
  const escaped = rawQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(escaped, "i");
  return {
    $or: [{ title: pattern }, { tags: pattern }, { categoryName: pattern }],
  };
}
