// 開発用シードデータ。ANTHROPIC_API_KEY未設定でもダッシュボードの見た目を確認できるようにするための
// サンプルデータであり、実運用データではない（Topic.rationaleに明記）。
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.topic.deleteMany();

  await prisma.topic.create({
    data: {
      title: "Mac miniにおすすめの外付けSSD",
      category: "ガジェット",
      searchDemand: 78,
      snsDemand: 65,
      trendScore: 60,
      competition: 55,
      affiliateScore: 88,
      productScore: 40,
      videoFit: 82,
      seoFit: 75,
      continuity: 60,
      totalScore: 68.4,
      rationale:
        "[サンプルデータ] Mac miniの買い替え需要と絡めてSSDのレビュー・比較記事は検索需要・アフィリエイト単価ともに高い。",
      status: "candidate",
    },
  });

  await prisma.topic.create({
    data: {
      title: "AI画像生成ツールの比較まとめ",
      category: "AI",
      searchDemand: 92,
      snsDemand: 95,
      trendScore: 90,
      competition: 70,
      affiliateScore: 60,
      productScore: 85,
      videoFit: 88,
      seoFit: 85,
      continuity: 92,
      totalScore: 84.9,
      rationale: "[サンプルデータ] AI系は検索・SNS双方で需要が強く、テンプレート/プロンプト集などの自社商品化にも向く。",
      status: "candidate",
    },
  });

  await prisma.topic.create({
    data: {
      title: "在宅ワーク向け作業効率化チェックリスト",
      category: "副業/ライフスタイル",
      searchDemand: 55,
      snsDemand: 50,
      trendScore: 40,
      competition: 35,
      affiliateScore: 45,
      productScore: 70,
      videoFit: 50,
      seoFit: 65,
      continuity: 70,
      totalScore: 58.7,
      rationale: "[サンプルデータ] 競合が比較的少なく、チェックリストPDFなど自社商品との親和性が高い。",
      status: "candidate",
    },
  });

  console.log("Seed完了: サンプルTopicを3件作成しました。");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
