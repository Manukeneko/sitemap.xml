import { callClaudeJson } from "@/lib/ai/providers/claude";
import { routeTask } from "@/lib/ai/router";
import { logAiUsage } from "@/lib/ai/costTracker";
import type { ContentGeneratorSpec, GeneratedDetail, GeneratorContext } from "@/lib/generators/types";

export async function runGenerator(
  spec: ContentGeneratorSpec,
  ctx: GeneratorContext,
  relatedContentId: string
): Promise<{ detail: GeneratedDetail; costUsd: number }> {
  const decision = routeTask(spec.taskKind);

  const { data, inputTokens, outputTokens } = await callClaudeJson<GeneratedDetail>({
    model: decision.model,
    system: spec.systemPrompt,
    prompt: spec.buildPrompt(ctx),
    maxTokens: 4096,
  });

  const costUsd = await logAiUsage({
    taskKind: spec.taskKind,
    provider: decision.provider,
    model: decision.model,
    inputTokens,
    outputTokens,
    relatedContentId,
  });

  return { detail: data, costUsd };
}
