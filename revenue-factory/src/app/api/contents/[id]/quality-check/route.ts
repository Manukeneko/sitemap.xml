import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runQualityCheck } from "@/lib/quality/checker";
import { isClaudeConfigured } from "@/lib/ai/providers/claude";

export const dynamic = "force-dynamic";

// POST /api/contents/:id/quality-check
// review状態のコンテンツに対して品質チェックAIを実行する。
// high severityの指摘があれば status を "flagged" にし、承認をブロックする（DESIGN.md §20）。
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isClaudeConfigured()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY が設定されていません。.env を確認してください。" },
      { status: 400 }
    );
  }

  const content = await db.content.findUnique({ where: { id: params.id } });
  if (!content) {
    return NextResponse.json({ error: "content not found" }, { status: 404 });
  }
  if (content.status !== "review" && content.status !== "flagged") {
    return NextResponse.json(
      { error: `status "${content.status}" は品質チェックできません（review/flagged状態のみ）` },
      { status: 400 }
    );
  }

  try {
    const { result } = await runQualityCheck(content);

    const updated = await db.content.update({
      where: { id: content.id },
      data: {
        qualityStatus: result.passed ? "passed" : "flagged",
        qualityNotes: JSON.stringify(result, null, 2),
        status: result.passed ? "review" : "flagged",
      },
    });

    return NextResponse.json({ content: updated, result });
  } catch (err) {
    console.error("[contents/quality-check] failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown error" },
      { status: 500 }
    );
  }
}
