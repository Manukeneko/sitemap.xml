import type { Publisher } from "@/lib/publishing/types";
import { manualExportPublisher } from "@/lib/publishing/publishers/manualExport";
import { xPostPublisher, xThreadPublisher } from "@/lib/publishing/publishers/xPublisher";

// platform別の公式API Publisherを追加した場合はここに登録し、manualExportPublisherより
// 優先して使う。X (x_post/x_thread) は実装済み（環境変数未設定ならmanualExportにフォールバック）。
// YouTube/Instagram/TikTokは動画・複数画像生成（Phase3の続き）が前提のため未実装、
// noteは公式APIが存在しないため未実装（DESIGN.md §16参照）。
const PLATFORM_PUBLISHERS: Publisher[] = [xPostPublisher, xThreadPublisher];

export function getPublisher(platform: string): Publisher {
  const specific = PLATFORM_PUBLISHERS.find((p) => p.platform === platform && p.isConfigured());
  return specific ?? manualExportPublisher;
}
