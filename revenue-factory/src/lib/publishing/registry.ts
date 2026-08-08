import type { Publisher } from "@/lib/publishing/types";
import { manualExportPublisher } from "@/lib/publishing/publishers/manualExport";

// platform別の公式API Publisherを追加した場合はここに登録し、manualExportPublisherより
// 優先して使う。現時点では全媒体をmanualExportPublisherにフォールバックする。
const PLATFORM_PUBLISHERS: Publisher[] = [];

export function getPublisher(platform: string): Publisher {
  const specific = PLATFORM_PUBLISHERS.find((p) => p.platform === platform && p.isConfigured());
  return specific ?? manualExportPublisher;
}
