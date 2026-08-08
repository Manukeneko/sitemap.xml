import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/contents?status=scheduled — ステータス別のコンテンツ一覧（Discordボット等から利用）
export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status") ?? undefined;
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit")) || 20, 50);

  const contents = await db.content.findMany({
    where: status ? { status } : undefined,
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: { topic: { select: { title: true } } },
  });

  return NextResponse.json({ contents });
}
