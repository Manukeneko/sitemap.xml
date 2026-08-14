import type { ContentGeneratorSpec, GeneratorContext } from "@/lib/generators/types";

const baseInfo = (ctx: GeneratorContext) => `テーマ: ${ctx.topicTitle}（カテゴリ: ${ctx.topicCategory}）
企画タイトル: ${ctx.planTitle}
企画構成案: ${ctx.planOutline}`;

export const youtubeLongSpec: ContentGeneratorSpec = {
  platform: "youtube_long",
  label: "YouTube長尺動画",
  taskKind: "long_form_script",
  contentType: "script",
  systemPrompt:
    "あなたはYouTube長尺動画の台本作成AIです。視聴維持率を意識し、冒頭で視聴者を引き込み、価値を提供しながら自然にCTA・アフィリエイト誘導につなげる構成を作ってください。",
  buildPrompt: (ctx) => `${baseInfo(ctx)}

以下のJSON形式で、YouTube長尺動画の台本一式を作成してください。
{
  "title": "SEOと惹きつけを両立したタイトル案",
  "hook": "冒頭15秒の導入トーク（視聴離脱を防ぐフック）",
  "script": "本編の台本。見出し（【】等）で区切り、ナレーション口調で具体的に記述する",
  "cta": "動画後半・エンディングでのCTA（チャンネル登録・関連動画・商品紹介への誘導）",
  "description": "YouTube概要欄用のテキスト",
  "hashtags": ["#タグ1", "#タグ2"],
  "thumbnailIdeas": ["サムネイル案1（構図・テキスト案）", "サムネイル案2"]
}`,
};

export const youtubeShortsSpec: ContentGeneratorSpec = {
  platform: "youtube_shorts",
  label: "YouTube Shorts（複数本）",
  taskKind: "short_copy",
  contentType: "shorts_batch",
  systemPrompt:
    "あなたはYouTube Shortsの台本作成AIです。長尺動画の企画から、独立して視聴されても面白い複数のShorts企画を切り出してください。最初の1-2秒で惹きつけるフックを最重要視してください。",
  buildPrompt: (ctx) => `${baseInfo(ctx)}

上記の長尺動画企画から、Shorts（60秒以内）を3〜5本切り出してください。単なる切り抜きではなく、それぞれが独立して視聴者を惹きつける構成にしてください。
以下のJSON形式で出力してください。
{
  "shorts": [
    {
      "title": "Shorts個別タイトル",
      "hook": "最初の1-2秒のフック（テキストや発話内容）",
      "script": "本編の短い台本",
      "caption": "投稿キャプション",
      "hashtags": ["#タグ1", "#タグ2"]
    }
  ]
}`,
};
