import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPublisher } from "@/lib/publishing/registry";

export const dynamic = "force-dynamic";

// POST /api/contents/:id/publish
// platform別の実Publisher（例: X API）が設定されていれば実際に投稿し status を published にする。
// 設定されていない場合（manualExportPublisherへのフォールバック）はコピペ用テキストだけ返し、
// status は変更しない（人間が /schedule → 手動投稿 → /mark-published を使う）。
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const content = await db.content.findUnique({ where: { id: params.id } });
  if (!content) {
    return NextResponse.json({ error: "content not found" }, { status: 404 });
  }
  if (content.status !== "approved" && content.status !== "scheduled") {
    return NextResponse.json(
      { error: `status "${content.status}" は投稿できません（approved/scheduled状態のみ）` },
      { status: 400 }
    );
  }

  const publisher = getPublisher(content.platform);
  const isRealPublisher = publisher.platform !== "*";

  if (!isRealPublisher) {
    const result = await publisher.publish(content);
    return NextResponse.json(
      {
        error: `platform "${content.platform}" 用の公式投稿API連携は未実装です。「投稿予定にする」→手動で投稿→「投稿完了にする」の手動フローを使ってください。`,
        exportedText: result.exportedText,
      },
      { status: 400 }
    );
  }

  try {
    const result = await publisher.publish(content);
    const updated = await db.content.update({
      where: { id: content.id },
      data: { status: "published", publishedAt: new Date(), publishedUrl: result.url ?? null },
    });
    return NextResponse.json({ content: updated, result });
  } catch (err) {
    console.error("[contents/publish] failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown error" },
      { status: 500 }
    );
  }
}
