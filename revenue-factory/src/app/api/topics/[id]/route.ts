import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/topics/:id — Topic詳細 + 生成済みContent一覧
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const topic = await db.topic.findUnique({
    where: { id: params.id },
    include: { contents: { orderBy: { createdAt: "asc" } } },
  });
  if (!topic) {
    return NextResponse.json({ error: "topic not found" }, { status: 404 });
  }
  return NextResponse.json({ topic });
}
