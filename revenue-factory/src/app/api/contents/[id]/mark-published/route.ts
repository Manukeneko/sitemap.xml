import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/contents/:id/mark-published
// 人間が実際に（手動で、またはPublisher経由で）投稿を完了させたことを記録する。
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const content = await db.content.findUnique({ where: { id: params.id } });
  if (!content) {
    return NextResponse.json({ error: "content not found" }, { status: 404 });
  }
  if (content.status !== "scheduled" && content.status !== "approved") {
    return NextResponse.json(
      { error: `status "${content.status}" は投稿済みにできません（approved/scheduled状態のみ）` },
      { status: 400 }
    );
  }

  const updated = await db.content.update({
    where: { id: content.id },
    data: { status: "published", publishedAt: new Date() },
  });

  return NextResponse.json({ content: updated });
}
