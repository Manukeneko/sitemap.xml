import type { Publisher } from "@/lib/publishing/types";
import { formatForExport } from "@/lib/publishing/formatForExport";

// SAFE MODE用のフォールバックPublisher。外部SNS APIを直接呼び出さず、
// 「人間がコピーしてそのまま投稿できるテキスト」を生成するところまでを担う。
// 各媒体の公式投稿API（YouTube Data API / Instagram Graph API 等）は、
// アプリ審査・OAuth連携が整い次第、platform別のPublisherとしてここに追加する。
export const manualExportPublisher: Publisher = {
  platform: "*",
  isConfigured() {
    return true;
  },
  async publish(content) {
    return {
      success: true,
      exportedText: formatForExport(content.platform, content.title, content.body),
    };
  },
};
