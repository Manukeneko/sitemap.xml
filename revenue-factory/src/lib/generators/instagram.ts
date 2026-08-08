import type { ContentGeneratorSpec, GeneratorContext } from "@/lib/generators/types";

const baseInfo = (ctx: GeneratorContext) => `テーマ: ${ctx.topicTitle}（カテゴリ: ${ctx.topicCategory}）
企画タイトル: ${ctx.planTitle}
企画構成案: ${ctx.planOutline}`;

export const instagramReelsSpec: ContentGeneratorSpec = {
  platform: "instagram_reels",
  label: "Instagram Reels",
  taskKind: "short_copy",
  contentType: "script",
  systemPrompt:
    "あなたはInstagram Reelsの台本作成AIです。縦型動画で保存・シェアされやすい、テンポの良い構成を作ってください。",
  buildPrompt: (ctx) => `${baseInfo(ctx)}

以下のJSON形式でInstagram Reelsの台本を作成してください。
{
  "hook": "最初の1-2秒のフック",
  "script": "本編の短い台本（テロップ案を含む）",
  "caption": "投稿キャプション（保存・共有を促す文言を含む）",
  "hashtags": ["#タグ1", "#タグ2"],
  "cta": "プロフィール誘導・保存促進などのCTA"
}`,
};

export const instagramCarouselSpec: ContentGeneratorSpec = {
  platform: "instagram_carousel",
  label: "Instagramカルーセル投稿",
  taskKind: "short_copy",
  contentType: "carousel",
  systemPrompt:
    "あなたはInstagramカルーセル投稿の作成AIです。1枚ごとに情報量を絞り、最後まで読み進めたくなる構成を作ってください。",
  buildPrompt: (ctx) => `${baseInfo(ctx)}

以下のJSON形式でカルーセル投稿（5〜8枚程度）を作成してください。
{
  "slides": [
    { "heading": "スライド見出し", "body": "スライド本文（簡潔に）" }
  ],
  "caption": "投稿キャプション",
  "hashtags": ["#タグ1", "#タグ2"],
  "cta": "保存・プロフィール誘導などのCTA"
}`,
};
