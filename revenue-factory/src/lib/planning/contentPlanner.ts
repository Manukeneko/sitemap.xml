import { callClaudeJson } from "@/lib/ai/providers/claude";
import { routeTask } from "@/lib/ai/router";
import { logAiUsage } from "@/lib/ai/costTracker";
import type { Topic } from "@prisma/client";

export interface ContentPlanItem {
  platform: string;
  contentType: string;
  title: string;
  outline: string; // 構成・要点（Phase2で台本AIが詳細化する前段の企画レベル）
}

const PLATFORMS = [
  { platform: "youtube_long", contentType: "video_plan", label: "YouTube長尺動画" },
  { platform: "youtube_shorts", contentType: "video_plan", label: "YouTube Shorts（複数本想定）" },
  { platform: "instagram_reels", contentType: "video_plan", label: "Instagram Reels" },
  { platform: "instagram_carousel", contentType: "post_plan", label: "Instagramカルーセル投稿" },
  { platform: "tiktok", contentType: "video_plan", label: "TikTok動画" },
  { platform: "x_post", contentType: "post_plan", label: "X通常投稿" },
  { platform: "x_thread", contentType: "post_plan", label: "Xスレッド" },
  { platform: "note_free", contentType: "article_plan", label: "note無料記事" },
  { platform: "note_paid", contentType: "article_plan", label: "note有料記事" },
  { platform: "blog_seo", contentType: "article_plan", label: "SEOブログ記事" },
  { platform: "affiliate", contentType: "article_plan", label: "アフィリエイト紹介記事" },
  { platform: "pdf", contentType: "product_plan", label: "PDF商品" },
  { platform: "ebook", contentType: "product_plan", label: "電子書籍" },
  { platform: "template", contentType: "product_plan", label: "テンプレート/チェックリスト" },
  { platform: "app_idea", contentType: "product_plan", label: "アプリ/Webツール化アイデア" },
] as const;

// コンテンツ企画AI（DESIGN.md §10）。
// 1つのTopicから、上記プラットフォーム分の企画案を一括生成する（1ネタ→複数媒体→複数収益源）。
export async function planContentsForTopic(
  topic: Topic
): Promise<{ items: ContentPlanItem[]; costUsd: number }> {
  const decision = routeTask("planning");

  const platformList = PLATFORMS.map((p) => `- ${p.platform} (${p.label})`).join("\n");

  const prompt = `以下のテーマから、各媒体向けのコンテンツ企画を生成してください。
単なる使い回しではなく、各媒体の特性（尺・フォーマット・ユーザー層）に合わせて内容・切り口を変えてください。

テーマ: ${topic.title}
カテゴリ: ${topic.category}
背景: ${topic.rationale ?? "なし"}

生成する媒体一覧:
${platformList}

出力は以下のJSON配列のみ。platformの値は上記一覧のキー（例: "youtube_long"）と完全一致させてください。
[
  { "platform": "youtube_long", "title": "動画タイトル案", "outline": "構成・要点を3-5行で" }
]`;

  const { data, inputTokens, outputTokens } = await callClaudeJson<
    Array<{ platform: string; title: string; outline: string }>
  >({
    model: decision.model,
    system:
      "あなたはマルチメディア展開に強いコンテンツ企画AIです。各媒体の特性を踏まえ、オリジナリティのある企画を提案してください。低品質な使い回しコンテンツの提案は避けてください。",
    prompt,
    maxTokens: 4096,
  });

  const costUsd = await logAiUsage({
    taskKind: "planning",
    provider: decision.provider,
    model: decision.model,
    inputTokens,
    outputTokens,
    relatedTopicId: topic.id,
  });

  const platformMeta = new Map<string, (typeof PLATFORMS)[number]>(
    PLATFORMS.map((p) => [p.platform, p])
  );
  const items: ContentPlanItem[] = data
    .filter((d) => platformMeta.has(d.platform))
    .map((d) => ({
      platform: d.platform,
      contentType: platformMeta.get(d.platform)!.contentType,
      title: d.title,
      outline: d.outline,
    }));

  return { items, costUsd };
}
