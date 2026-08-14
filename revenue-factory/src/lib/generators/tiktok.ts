import type { ContentGeneratorSpec, GeneratorContext } from "@/lib/generators/types";

const baseInfo = (ctx: GeneratorContext) => `テーマ: ${ctx.topicTitle}（カテゴリ: ${ctx.topicCategory}）
企画タイトル: ${ctx.planTitle}
企画構成案: ${ctx.planOutline}`;

export const tiktokSpec: ContentGeneratorSpec = {
  platform: "tiktok",
  label: "TikTok動画",
  taskKind: "short_copy",
  contentType: "script",
  systemPrompt:
    "あなたはTikTok動画の台本作成AIです。最初の数秒で興味を引く構成を最優先し、テンポの速い口語調で作成してください。",
  buildPrompt: (ctx) => `${baseInfo(ctx)}

以下のJSON形式でTikTok動画の台本を作成してください。
{
  "hook": "最初の2-3秒で視聴を止めさせるフック（画面テキスト or 発話）",
  "script": "本編の台本",
  "caption": "投稿キャプション",
  "hashtags": ["#タグ1", "#タグ2"]
}`,
};
