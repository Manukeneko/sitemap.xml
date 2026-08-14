import { callClaudeJson } from "@/lib/ai/providers/claude";
import { routeTask } from "@/lib/ai/router";
import { logAiUsage } from "@/lib/ai/costTracker";
import type { TopicCandidate } from "@/lib/research/aggregator";

export interface SubScores {
  searchDemand: number;
  snsDemand: number;
  trendScore: number;
  competition: number; // 高いほど競合が激しい
  affiliateScore: number;
  productScore: number;
  videoFit: number;
  seoFit: number;
  continuity: number;
  rationale: string;
}

export interface ScoredTopic extends SubScores {
  title: string;
  category: string;
  totalScore: number;
}

// 収益性スコアリングAI（DESIGN.md §10, ユーザー仕様§4のルーブリックに対応）。
// 各項目のスコアはClaudeによる定性判断、総合スコアはコード側で決定的な加重平均として算出する
// （AIの気分でスコアが揺れないようにするため）。
const WEIGHTS = {
  searchDemand: 0.15,
  snsDemand: 0.15,
  trendScore: 0.1,
  competitionInverse: 0.1, // (100 - competition) に掛かる
  affiliateScore: 0.15,
  productScore: 0.1,
  videoFit: 0.1,
  seoFit: 0.05,
  continuity: 0.1,
};

export function computeTotalScore(s: SubScores): number {
  const total =
    s.searchDemand * WEIGHTS.searchDemand +
    s.snsDemand * WEIGHTS.snsDemand +
    s.trendScore * WEIGHTS.trendScore +
    (100 - s.competition) * WEIGHTS.competitionInverse +
    s.affiliateScore * WEIGHTS.affiliateScore +
    s.productScore * WEIGHTS.productScore +
    s.videoFit * WEIGHTS.videoFit +
    s.seoFit * WEIGHTS.seoFit +
    s.continuity * WEIGHTS.continuity;
  return Math.round(total * 10) / 10;
}

export async function scoreTopic(
  candidate: TopicCandidate
): Promise<{ scored: ScoredTopic; costUsd: number }> {
  const decision = routeTask("scoring");

  const prompt = `以下のコンテンツテーマを、収益化の観点で0-100点でスコアリングしてください。

テーマ: ${candidate.title}
カテゴリ: ${candidate.category}
補足: ${candidate.rationale}

評価項目（すべて0-100の整数）:
- searchDemand: 検索需要
- snsDemand: SNSでの話題性・需要
- trendScore: 今のトレンド性
- competition: 競合の激しさ（激しいほど高スコア。低い方が狙い目）
- affiliateScore: アフィリエイト適性（紹介できる商品の有無・単価）
- productScore: 自社デジタル商品化のしやすさ（PDF/電子書籍/テンプレート等）
- videoFit: 動画（YouTube長尺・Shorts）化のしやすさ
- seoFit: SEOブログ記事としての適性
- continuity: シリーズ化・継続コンテンツ化のしやすさ

出力は以下のJSONのみ:
{
  "searchDemand": 0, "snsDemand": 0, "trendScore": 0, "competition": 0,
  "affiliateScore": 0, "productScore": 0, "videoFit": 0, "seoFit": 0, "continuity": 0,
  "rationale": "総合的な評価コメント（2-3文）"
}`;

  const { data, inputTokens, outputTokens } = await callClaudeJson<SubScores>({
    model: decision.model,
    system:
      "あなたは収益性スコアリングAIです。楽観的すぎず、実際の市場感覚に基づいて厳密にスコアリングしてください。",
    prompt,
    maxTokens: 1024,
  });

  const costUsd = await logAiUsage({
    taskKind: "scoring",
    provider: decision.provider,
    model: decision.model,
    inputTokens,
    outputTokens,
  });

  const totalScore = computeTotalScore(data);

  return {
    scored: { ...data, title: candidate.title, category: candidate.category, totalScore },
    costUsd,
  };
}
