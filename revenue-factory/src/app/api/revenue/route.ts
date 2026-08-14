import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/revenue — 収益実績の手動登録（DESIGN.md §14）。
// 各媒体の分析APIとの自動連携はPhase6〜7で拡張し、それまでは手動入力で運用する。
// body: { platform, contentId?, productId?, date, revenueAmount, clicks?, conversions? }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || !body.platform || typeof body.revenueAmount !== "number") {
    return NextResponse.json(
      { error: "platform と revenueAmount(数値) は必須です" },
      { status: 400 }
    );
  }

  const revenue = await db.revenue.create({
    data: {
      platform: body.platform,
      contentId: body.contentId || null,
      productId: body.productId || null,
      date: body.date ? new Date(body.date) : new Date(),
      revenueAmount: body.revenueAmount,
      clicks: body.clicks ?? 0,
      conversions: body.conversions ?? 0,
    },
  });

  return NextResponse.json({ revenue });
}

// GET /api/revenue — 直近の収益実績一覧
export async function GET() {
  const revenues = await db.revenue.findMany({
    orderBy: { date: "desc" },
    take: 50,
    include: { content: { select: { title: true, platform: true, topicId: true } } },
  });
  return NextResponse.json({ revenues });
}
