import { db } from "@/lib/db";

// 画像/音声生成は入出力トークン課金ではないため、環境変数による概算コストで記録する。
// 正確な値はプロバイダの最新料金ページを確認して .env で上書きすること（DESIGN.md §25）。
const IMAGE_COST_USD = Number(process.env.IMAGE_COST_USD) || 0.04;
const TTS_COST_PER_1K_CHARS_USD = Number(process.env.TTS_COST_PER_1K_CHARS_USD) || 0.015;

export function estimateImageCostUsd(): number {
  return IMAGE_COST_USD;
}

export function estimateTtsCostUsd(charCount: number): number {
  return (charCount / 1000) * TTS_COST_PER_1K_CHARS_USD;
}

export async function logMediaUsage(params: {
  kind: "image" | "audio";
  provider: string;
  model: string;
  costUsd: number;
  relatedContentId: string;
}) {
  await db.aiUsageLog.create({
    data: {
      taskKind: `media_${params.kind}`,
      provider: params.provider,
      model: params.model,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: params.costUsd,
      relatedContentId: params.relatedContentId,
    },
  });
}
