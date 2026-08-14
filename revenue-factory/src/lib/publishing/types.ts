import type { Content } from "@prisma/client";

export interface PublishResult {
  success: boolean;
  exportedText: string;
  url?: string;
  error?: string;
}

export interface Publisher {
  platform: string; // 対応するContent.platform。"*" は全媒体に対応するフォールバック
  isConfigured(): boolean;
  publish(content: Content): Promise<PublishResult>;
}
