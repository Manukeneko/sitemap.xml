import { db } from "@/lib/db";

export interface TopicRoi {
  topicId: string;
  title: string;
  status: string;
  aiCostUsd: number;
  aiCostJpy: number;
  revenueJpy: number;
  profitJpy: number;
  isLoss: boolean;
}

// ROI最適化（DESIGN.md §14, §26）。
// Revenue（円建てを想定）とAiUsageLog（USD建て）を USD_JPY_RATE で揃えて比較する。
// 為替APIは導入しておらず、環境変数による概算レートである点に注意（.env.example参照）。
export async function computeTopicRoi(): Promise<TopicRoi[]> {
  const rate = Number(process.env.USD_JPY_RATE) || 150;

  const topics = await db.topic.findMany({ include: { contents: { select: { id: true } } } });

  const results: TopicRoi[] = [];
  for (const topic of topics) {
    const contentIds = topic.contents.map((c) => c.id);

    const [aiCostAgg, revenueAgg] = await Promise.all([
      db.aiUsageLog.aggregate({
        _sum: { costUsd: true },
        where: {
          OR: [
            { relatedTopicId: topic.id },
            ...(contentIds.length > 0 ? [{ relatedContentId: { in: contentIds } }] : []),
          ],
        },
      }),
      contentIds.length > 0
        ? db.revenue.aggregate({
            _sum: { revenueAmount: true },
            where: { contentId: { in: contentIds } },
          })
        : Promise.resolve({ _sum: { revenueAmount: 0 } }),
    ]);

    const aiCostUsd = aiCostAgg._sum.costUsd ?? 0;
    const aiCostJpy = aiCostUsd * rate;
    const revenueJpy = revenueAgg._sum.revenueAmount ?? 0;
    const profitJpy = revenueJpy - aiCostJpy;

    results.push({
      topicId: topic.id,
      title: topic.title,
      status: topic.status,
      aiCostUsd,
      aiCostJpy,
      revenueJpy,
      profitJpy,
      isLoss: profitJpy < 0 && aiCostJpy > 0,
    });
  }

  return results.sort((a, b) => b.profitJpy - a.profitJpy);
}
