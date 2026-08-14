import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/contents/:id/schedule — 承認済みコンテンツを投稿予定にする
// body: { scheduledAt?: string(ISO) }（省略時は現在時刻）
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const content = await db.content.findUnique({ where: { id: params.id } });
  if (!content) {
    return NextResponse.json({ error: "content not found" }, { status: 404 });
  }
  if (content.status !== "approved") {
    return NextResponse.json(
      { error: `status "${content.status}" は投稿予定にできません（approved状態のみ）` },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : new Date();

  const updated = await db.content.update({
    where: { id: content.id },
    data: { status: "scheduled", scheduledAt },
  });

  return NextResponse.json({ content: updated });
}
