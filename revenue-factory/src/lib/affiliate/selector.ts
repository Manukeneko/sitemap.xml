import { callClaudeJson } from "@/lib/ai/providers/claude";
import { routeTask } from "@/lib/ai/router";
import { logAiUsage } from "@/lib/ai/costTracker";
import { rakutenSource } from "@/lib/affiliate/sources/rakuten";
import { amazonSource } from "@/lib/affiliate/sources/amazon";
import type { AffiliateItem, AffiliateSource } from "@/lib/affiliate/types";
import type { Topic } from "@prisma/client";

const SOURCES: AffiliateSource[] = [rakutenSource, amazonSource];

export interface SelectedProduct {
  name: string;
  category: string; // amazon | rakuten | asp | own_pdf | own_course | own_template | app
  price?: number;
  commission?: number;
  url?: string;
  score: number; // 0-100 このテーマでの紹介優先度
  rationale: string;
}

// アフィリエイトAI（DESIGN.md §10, §12）。
// 設定済みのアフィリエイトソースから実在の商品候補を取得し、
// Claudeに「このテーマで紹介すると最も収益期待値が高いか」を判断させる。
export async function findAffiliateProducts(
  topic: Topic
): Promise<{ products: SelectedProduct[]; candidates: AffiliateItem[]; costUsd: number }> {
  const configuredSources = SOURCES.filter((s) => s.isConfigured());
  const candidatesBySources = await Promise.all(
    configuredSources.map((s) => s.searchItems(topic.title))
  );
  const candidates = candidatesBySources.flat();

  const decision = routeTask("affiliate_selection");

  if (candidates.length === 0) {
    // 実在商品データが無い場合、Claudeの知識だけで金額等を断定するのは誠実でないため、
    // 「一般的にどんな商品カテゴリが有効か」という方向性の提案に留める。
    const prompt = `テーマ「${topic.title}」（カテゴリ: ${topic.category}）に対して、
アフィリエイト収益化の観点でどのような商品カテゴリ・案件を狙うべきか、方向性を2〜4件提案してください。
実在の商品名や具体的な価格は分からないため、断定しないでください。

出力は以下のJSON配列のみ:
[
  { "name": "商品カテゴリ・案件の方向性（例: 外付けSSD一般）", "category": "rakuten", "score": 50, "rationale": "理由" }
]`;
    const { data, inputTokens, outputTokens } = await callClaudeJson<SelectedProduct[]>({
      model: decision.model,
      system:
        "あなたはアフィリエイトAIです。実在商品データがない場合に、憶測の価格や実在しない商品名を断定的に提示しないでください。",
      prompt,
      maxTokens: 1024,
    });
    const costUsd = await logAiUsage({
      taskKind: "affiliate_selection",
      provider: decision.provider,
      model: decision.model,
      inputTokens,
      outputTokens,
      relatedTopicId: topic.id,
    });
    return { products: data, candidates: [], costUsd };
  }

  const candidateList = candidates
    .slice(0, 20)
    .map(
      (c, i) =>
        `${i + 1}. [${c.source}] ${c.name}${c.price ? ` / ¥${c.price}` : ""} - ${c.url}`
    )
    .join("\n");

  const prompt = `テーマ「${topic.title}」（カテゴリ: ${topic.category}）に対して、
以下の実在する商品候補の中から、紹介する価値が高い順に最大5件を選び、収益期待値をスコアリングしてください。

商品候補:
${candidateList}

出力は以下のJSON配列のみ。urlは候補リストのものをそのまま使ってください。
[
  { "name": "商品名", "category": "rakuten", "price": 0, "url": "候補のURL", "score": 0, "rationale": "選んだ理由（テーマとの関連性・コンバージョン見込み）" }
]`;

  const { data, inputTokens, outputTokens } = await callClaudeJson<SelectedProduct[]>({
    model: decision.model,
    system:
      "あなたはアフィリエイトAIです。実在する商品候補の中から、テーマとの関連性・売れやすさの観点で最も収益期待値が高いものを選定してください。",
    prompt,
    maxTokens: 2048,
  });

  const costUsd = await logAiUsage({
    taskKind: "affiliate_selection",
    provider: decision.provider,
    model: decision.model,
    inputTokens,
    outputTokens,
    relatedTopicId: topic.id,
  });

  return { products: data, candidates, costUsd };
}
