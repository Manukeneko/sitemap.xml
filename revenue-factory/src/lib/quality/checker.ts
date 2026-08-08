import { callClaudeJson } from "@/lib/ai/providers/claude";
import { routeTask } from "@/lib/ai/router";
import { logAiUsage } from "@/lib/ai/costTracker";
import type { Content } from "@prisma/client";

export interface QualityIssue {
  category:
    | "misinformation"
    | "copyright"
    | "trademark"
    | "unauthorized_use"
    | "ai_disclosure"
    | "platform_policy"
    | "ad_disclosure"
    | "high_risk_topic"
    | "exaggerated_claim"
    | "low_quality"
    | "duplicate_content"
    | "other";
  severity: "low" | "medium" | "high";
  detail: string;
}

export interface QualityCheckResult {
  passed: boolean;
  issues: QualityIssue[];
  summary: string;
}

// 品質チェックAI（DESIGN.md §20）。投稿前に別AIとしてチェックし、
// severity: high の指摘が1件でもあれば承認をブロックする。
export async function runQualityCheck(
  content: Content
): Promise<{ result: QualityCheckResult; costUsd: number }> {
  const decision = routeTask("quality_check");

  const prompt = `以下は投稿予定のコンテンツです。投稿前チェックを行ってください。

媒体: ${content.platform}
タイトル: ${content.title}
本文/構成:
${content.body}

チェック項目:
- 誤情報・虚偽情報の可能性
- 著作権侵害・他人のコンテンツの無断利用の可能性
- 商標侵害の可能性
- 生成AI利用に関する問題（AI生成である旨の開示が必要な文脈で欠けていないか）
- 各プラットフォームの規約に抵触しそうな表現
- 広告・アフィリエイト表示が必要な文脈で欠けていないか
- 医療・金融など高リスク分野への言及で不適切な断定がないか
- 誇大広告・誇張表現
- 低品質・内容が薄い、または重複コンテンツ的でないか

出力は以下のJSON形式のみ:
{
  "passed": true,
  "issues": [
    { "category": "ad_disclosure", "severity": "medium", "detail": "指摘内容" }
  ],
  "summary": "総評（1-2文）"
}
severityがhighの指摘が1件でもあれば passed は false にしてください。`;

  const { data, inputTokens, outputTokens } = await callClaudeJson<QualityCheckResult>({
    model: decision.model,
    system:
      "あなたはコンテンツの投稿前品質チェックAIです。楽観的に見逃さず、実際に投稿した場合のリスクを厳密に評価してください。問題がなければpassed:trueとしてissuesは空配列にしてください。",
    prompt,
    maxTokens: 1536,
  });

  const costUsd = await logAiUsage({
    taskKind: "quality_check",
    provider: decision.provider,
    model: decision.model,
    inputTokens,
    outputTokens,
    relatedContentId: content.id,
  });

  const hasHighSeverity = data.issues?.some((i) => i.severity === "high") ?? false;
  const result: QualityCheckResult = {
    ...data,
    passed: data.passed && !hasHighSeverity,
  };

  return { result, costUsd };
}
