import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/stats — ダッシュボード「今日」セクション用の集計（DESIGN.md §17相当）
export async function GET() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [topicsToday, contentsToday, usageToday, usageTotal, topTopic] = await Promise.all([
    db.topic.count({ where: { createdAt: { gte: startOfToday } } }),
    db.content.count({ where: { createdAt: { gte: startOfToday } } }),
    db.aiUsageLog.aggregate({ _sum: { costUsd: true }, where: { createdAt: { gte: startOfToday } } }),
    db.aiUsageLog.aggregate({ _sum: { costUsd: true } }),
    db.topic.findFirst({ orderBy: { totalScore: "desc" } }),
  ]);

  return NextResponse.json({
    topicsToday,
    contentsToday,
    aiCostTodayUsd: usageToday._sum.costUsd ?? 0,
    aiCostTotalUsd: usageTotal._sum.costUsd ?? 0,
    topTopic,
  });
}
