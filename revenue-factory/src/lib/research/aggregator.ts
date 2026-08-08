import { callClaudeJson } from "@/lib/ai/providers/claude";
import { routeTask } from "@/lib/ai/router";
import { logAiUsage } from "@/lib/ai/costTracker";
import { youtubeSource } from "@/lib/research/sources/youtube";
import { googleTrendsSource } from "@/lib/research/sources/googleTrends";
import type { Signal, SignalSource } from "@/lib/research/types";

const SOURCES: SignalSource[] = [youtubeSource, googleTrendsSource];

export interface TopicCandidate {
  title: string;
  category: string;
  rationale: string;
}

// 市場調査AI（DESIGN.md §10）。
// 設定済みの外部シグナルソースがあれば取得して文脈として与え、
// Claudeに「今作る価値があるテーマ」を提案させる。
export async function runMarketResearch(params: {
  seed?: string;
  category?: string;
  count?: number;
}): Promise<{ candidates: TopicCandidate[]; signals: Signal[]; costUsd: number }> {
  const count = params.count ?? 5;

  const configuredSources = SOURCES.filter((s) => s.isConfigured());
  const signalsBySources = await Promise.all(
    configuredSources.map((s) => s.fetchSignals(params.seed))
  );
  const signals = signalsBySources.flat();

  const decision = routeTask("research_summarize");
  const today = new Date().toISOString().slice(0, 10);

  const signalContext =
    signals.length > 0
      ? `以下は外部データソースから取得した最新シグナルです。これを優先的に参考にしてください:\n${signals
          .slice(0, 30)
          .map((s) => `- [${s.source}] ${s.label}${s.score ? ` (score:${s.score})` : ""}`)
          .join("\n")}`
      : `外部シグナルソース（YouTube Data API / SerpApi等）は現在未設定のため、あなたの知識に基づいて提案してください。未設定である旨を各テーマのrationaleで触れる必要はありません。`;

  const prompt = `あなたは「AI収益工場」の市場調査AIです。今日の日付は ${today} です。
${params.category ? `対象ジャンル: ${params.category}` : "ジャンルは問いません。幅広い収益化可能なジャンルから提案してください。"}
${params.seed ? `注目キーワード/シード: ${params.seed}` : ""}

${signalContext}

収益化の可能性が高い（YouTube/Instagram/TikTok/X/note/ブログ/アフィリエイト/デジタル商品化のいずれか、または複数に展開しやすい）テーマを ${count} 件提案してください。
出力は以下のJSON配列のみ:
[
  { "title": "テーマ名", "category": "カテゴリ", "rationale": "このテーマを選んだ理由（1-2文）" }
]`;

  const { data, inputTokens, outputTokens } = await callClaudeJson<TopicCandidate[]>({
    model: decision.model,
    system:
      "あなたは収益化に強いコンテンツテーマを発掘する市場調査AIです。具体性があり、実際にコンテンツ化・収益化しやすいテーマのみを提案してください。",
    prompt,
    maxTokens: 2048,
  });

  const costUsd = await logAiUsage({
    taskKind: "research_summarize",
    provider: decision.provider,
    model: decision.model,
    inputTokens,
    outputTokens,
  });

  return { candidates: data, signals, costUsd };
}
