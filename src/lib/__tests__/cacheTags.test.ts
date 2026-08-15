import { describe, it, expect, vi, beforeEach } from "vitest";

const updateTagMock = vi.fn();
vi.mock("next/cache", () => ({
  updateTag: (tag: string) => updateTagMock(tag),
}));

const { revalidateTags, POSTS_TAG, postTag, categoryTag } = await import("@/lib/cacheTags");

beforeEach(() => {
  updateTagMock.mockReset();
});

describe("revalidateTags", () => {
  it("revalidates the shared posts tag plus every specific tag supplied", async () => {
    await revalidateTags([postTag("karwa-chauth"), categoryTag("Vrat Katha")]);

    expect(updateTagMock).toHaveBeenCalledWith(POSTS_TAG);
    expect(updateTagMock).toHaveBeenCalledWith("post-karwa-chauth");
    expect(updateTagMock).toHaveBeenCalledWith("category-Vrat Katha");
  });

  it("logs and does not throw when updateTag fails after a successful DB write", async () => {
    updateTagMock.mockImplementation(() => {
      throw new Error("no request context");
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(revalidateTags(["post-some-slug"])).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
