import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getGeneratorSpec, runGenerator } from "@/lib/generators";
import { isClaudeConfigured } from "@/lib/ai/providers/claude";

export const dynamic = "force-dynamic";

// POST /api/contents/:id/generate
// コンテンツ企画AIが作った企画（draft）を、媒体別AIで台本・原稿レベルまで詳細化する。
// SAFE MODE（DESIGN.md §13）: 生成後は自動投稿せず review 状態にして人間の確認を待つ。
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isClaudeConfigured()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY が設定されていません。.env を確認してください。" },
      { status: 400 }
    );
  }

  const content = await db.content.findUnique({
    where: { id: params.id },
    include: { topic: true },
  });
  if (!content) {
    return NextResponse.json({ error: "content not found" }, { status: 404 });
  }

  const spec = getGeneratorSpec(content.platform);
  if (!spec) {
    return NextResponse.json(
      { error: `platform "${content.platform}" 用の生成AIはまだ実装されていません` },
      { status: 400 }
    );
  }

  try {
    const { detail } = await runGenerator(
      spec,
      {
        topicTitle: content.topic.title,
        topicCategory: content.topic.category,
        planTitle: content.title,
        planOutline: content.body,
      },
      content.id
    );

    const updated = await db.content.update({
      where: { id: content.id },
      data: {
        body: JSON.stringify(detail, null, 2),
        contentType: spec.contentType,
        status: "review",
      },
    });

    return NextResponse.json({ content: updated });
  } catch (err) {
    console.error("[contents/generate] failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown error" },
      { status: 500 }
    );
  }
}
