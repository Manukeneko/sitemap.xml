import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { findAffiliateProducts } from "@/lib/affiliate/selector";
import { isClaudeConfigured } from "@/lib/ai/providers/claude";

export const dynamic = "force-dynamic";

// POST /api/topics/:id/affiliate — アフィリエイトAIを実行し、Productとして保存する
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isClaudeConfigured()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY が設定されていません。.env を確認してください。" },
      { status: 400 }
    );
  }

  const topic = await db.topic.findUnique({ where: { id: params.id } });
  if (!topic) {
    return NextResponse.json({ error: "topic not found" }, { status: 404 });
  }

  try {
    const { products } = await findAffiliateProducts(topic);

    const created = await db.$transaction(
      products.map((p) =>
        db.product.create({
          data: {
            topicId: topic.id,
            name: p.name,
            category: p.category,
            price: p.price ?? null,
            commission: p.commission ?? null,
            url: p.url ?? null,
            score: p.score,
          },
        })
      )
    );

    return NextResponse.json({ products: created });
  } catch (err) {
    console.error("[topics/affiliate] failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown error" },
      { status: 500 }
    );
  }
}
