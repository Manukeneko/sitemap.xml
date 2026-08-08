import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPublisher } from "@/lib/publishing/registry";

export const dynamic = "force-dynamic";

// GET /api/contents/:id/export — コピペ投稿用に整形したテキストを取得する（状態は変更しない）
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const content = await db.content.findUnique({ where: { id: params.id } });
  if (!content) {
    return NextResponse.json({ error: "content not found" }, { status: 404 });
  }

  const publisher = getPublisher(content.platform);
  const result = await publisher.publish(content);
  return NextResponse.json(result);
}
