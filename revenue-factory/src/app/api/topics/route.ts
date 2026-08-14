import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/topics — 収益期待値順のテーマランキング
export async function GET() {
  const topics = await db.topic.findMany({
    orderBy: { totalScore: "desc" },
    include: { _count: { select: { contents: true } } },
    take: 50,
  });
  return NextResponse.json({ topics });
}
