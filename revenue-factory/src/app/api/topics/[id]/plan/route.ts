import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { planContentsForTopic } from "@/lib/planning/contentPlanner";
import { isClaudeConfigured } from "@/lib/ai/providers/claude";

export const dynamic = "force-dynamic";

// POST /api/topics/:id/plan — コンテンツ企画AIを実行し、媒体別Contentを作成する
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
    const { items } = await planContentsForTopic(topic);

    const created = await db.$transaction([
      ...items.map((item) =>
        db.content.create({
          data: {
            topicId: topic.id,
            platform: item.platform,
            contentType: item.contentType,
            title: item.title,
            body: item.outline,
            status: "draft",
          },
        })
      ),
      db.topic.update({ where: { id: topic.id }, data: { status: "planned" } }),
    ]);

    return NextResponse.json({ contents: created.slice(0, -1) });
  } catch (err) {
    console.error("[topics/plan] failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown error" },
      { status: 500 }
    );
  }
}
