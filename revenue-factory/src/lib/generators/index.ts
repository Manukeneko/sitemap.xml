import type { ContentGeneratorSpec } from "@/lib/generators/types";
import { youtubeLongSpec, youtubeShortsSpec } from "@/lib/generators/youtube";
import { instagramReelsSpec, instagramCarouselSpec } from "@/lib/generators/instagram";
import { tiktokSpec } from "@/lib/generators/tiktok";
import { xPostSpec, xThreadSpec } from "@/lib/generators/x";
import { noteFreeSpec, notePaidSpec } from "@/lib/generators/note";
import { blogSeoSpec } from "@/lib/generators/blog";

export * from "@/lib/generators/types";
export { runGenerator } from "@/lib/generators/runner";

// 新しい媒体AIを追加する場合は generators/ に spec ファイルを追加し、ここに登録するだけでよい
// （DESIGN.md §8 の拡張可能設計）。
const GENERATOR_SPECS: ContentGeneratorSpec[] = [
  youtubeLongSpec,
  youtubeShortsSpec,
  instagramReelsSpec,
  instagramCarouselSpec,
  tiktokSpec,
  xPostSpec,
  xThreadSpec,
  noteFreeSpec,
  notePaidSpec,
  blogSeoSpec,
];

const REGISTRY = new Map<string, ContentGeneratorSpec>(GENERATOR_SPECS.map((s) => [s.platform, s]));

export function getGeneratorSpec(platform: string): ContentGeneratorSpec | undefined {
  return REGISTRY.get(platform);
}
