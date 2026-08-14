import { db } from "@/lib/db";
import type { TaskKind } from "@/lib/ai/router";

// USD per 1M tokens (input, output). Anthropic公開価格の目安。§5参照。
const PRICING_PER_MTOK: Record<string, { input: number; output: number }> = {
  "claude-sonnet-5": { input: 3, output: 15 },
  "claude-opus-5": { input: 5, output: 25 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING_PER_MTOK[model];
  if (!pricing) return 0;
  return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
}

export async function logAiUsage(params: {
  taskKind: TaskKind;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  relatedTopicId?: string;
  relatedContentId?: string;
}) {
  const costUsd = estimateCostUsd(params.model, params.inputTokens, params.outputTokens);
  await db.aiUsageLog.create({
    data: {
      taskKind: params.taskKind,
      provider: params.provider,
      model: params.model,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      costUsd,
      relatedTopicId: params.relatedTopicId,
      relatedContentId: params.relatedContentId,
    },
  });
  return costUsd;
}
