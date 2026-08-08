import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runMarketResearch } from "@/lib/research/aggregator";
import { scoreTopic } from "@/lib/scoring/engine";
import { isClaudeConfigured } from "@/lib/ai/providers/claude";

export const dynamic = "force-dynamic";

// POST /api/research/run
// body: { seed?: string; category?: string; count?: number }
// 市場調査AI → 収益性スコアリングAI を実行し、Topicとして保存する。
export async function POST(req: NextRequest) {
  if (!isClaudeConfigured()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY が設定されていません。.env を確認してください。" },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const seed: string | undefined = body.seed;
  const category: string | undefined = body.category;
  const count: number = Math.min(Math.max(Number(body.count) || 5, 1), 10);

  try {
    const { candidates, signals } = await runMarketResearch({ seed, category, count });

    const createdTopics = [];
    for (const candidate of candidates) {
      const { scored } = await scoreTopic(candidate);
      const topic = await db.topic.create({
        data: {
          title: scored.title,
          category: scored.category,
          searchDemand: scored.searchDemand,
          snsDemand: scored.snsDemand,
          trendScore: scored.trendScore,
          competition: scored.competition,
          affiliateScore: scored.affiliateScore,
          productScore: scored.productScore,
          videoFit: scored.videoFit,
          seoFit: scored.seoFit,
          continuity: scored.continuity,
          totalScore: scored.totalScore,
          rationale: scored.rationale,
          sourceSignals: JSON.stringify(signals.slice(0, 20)),
        },
      });
      createdTopics.push(topic);
    }

    return NextResponse.json({ topics: createdTopics });
  } catch (err) {
    console.error("[research/run] failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown error" },
      { status: 500 }
    );
  }
}
