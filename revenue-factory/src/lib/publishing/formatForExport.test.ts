import { describe, expect, it } from "vitest";
import { formatForExport } from "@/lib/publishing/formatForExport";

describe("formatForExport", () => {
  it("returns the raw body when it is not valid JSON (draft/outline stage)", () => {
    const raw = "これは企画段階のプレーンテキストの構成案です";
    expect(formatForExport("youtube_long", "タイトル", raw)).toBe(raw);
  });

  it("formats known fields from generated YouTube content into readable sections", () => {
    const body = JSON.stringify({
      title: "動画タイトル",
      hook: "冒頭フック",
      script: "本編の台本",
      cta: "登録してね",
      hashtags: ["#foo", "#bar"],
      thumbnailIdeas: ["案1", "案2"],
    });
    const text = formatForExport("youtube_long", "企画タイトル", body);

    expect(text).toContain("--- youtube_long / 企画タイトル ---");
    expect(text).toContain("【タイトル】\n動画タイトル");
    expect(text).toContain("【フック】\n冒頭フック");
    expect(text).toContain("【台本】\n本編の台本");
    expect(text).toContain("【CTA】\n登録してね");
    expect(text).toContain("#foo");
    expect(text).toContain("案1");
  });

  it("formats X thread tweets as a list", () => {
    const body = JSON.stringify({ tweets: ["1件目", "2件目"], finalCta: "続きはブログで" });
    const text = formatForExport("x_thread", "スレッド企画", body);

    expect(text).toContain("【スレッド】");
    expect(text).toContain("- 1件目");
    expect(text).toContain("- 2件目");
    expect(text).toContain("【スレッド最後のCTA】\n続きはブログで");
  });

  it("falls back to raw JSON when no known fields are present", () => {
    const body = JSON.stringify({ unknownField: "some value" });
    const text = formatForExport("blog_seo", "タイトル", body);

    expect(text).toContain("--- blog_seo / タイトル ---");
    expect(text).toContain("unknownField");
    expect(text).toContain("some value");
  });
});
