import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/topics/:id/archive
// 収益 < AIコスト になっているテーマ等を停止する操作（DESIGN.md §14, §26 ROI最適化）。
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const topic = await db.topic.findUnique({ where: { id: params.id } });
  if (!topic) {
    return NextResponse.json({ error: "topic not found" }, { status: 404 });
  }
  const updated = await db.topic.update({ where: { id: topic.id }, data: { status: "archived" } });
  return NextResponse.json({ topic: updated });
}
