import type { ContentGeneratorSpec, GeneratorContext } from "@/lib/generators/types";

const baseInfo = (ctx: GeneratorContext) => `テーマ: ${ctx.topicTitle}（カテゴリ: ${ctx.topicCategory}）
企画タイトル: ${ctx.planTitle}
企画構成案: ${ctx.planOutline}`;

export const xPostSpec: ContentGeneratorSpec = {
  platform: "x_post",
  label: "X通常投稿",
  taskKind: "short_copy",
  contentType: "post",
  systemPrompt:
    "あなたはX（旧Twitter）投稿の作成AIです。単なる宣伝ではなく、まず読者に価値を提供した上で自然に誘導する投稿を作成してください。",
  buildPrompt: (ctx) => `${baseInfo(ctx)}

以下のJSON形式でX投稿を作成してください（本文は全角換算で140字程度を目安に）。
{
  "text": "投稿本文",
  "hashtags": ["#タグ1", "#タグ2"]
}`,
};

export const xThreadSpec: ContentGeneratorSpec = {
  platform: "x_thread",
  label: "Xスレッド",
  taskKind: "short_copy",
  contentType: "thread",
  systemPrompt:
    "あなたはXスレッド（連続投稿）の作成AIです。1件目で興味を引き、価値提供をしながら最後に自然な形でブログ/note/アフィリエイトへ誘導する構成にしてください。",
  buildPrompt: (ctx) => `${baseInfo(ctx)}

以下のJSON形式でXスレッド（5〜8投稿）を作成してください。
{
  "tweets": ["1件目の投稿文", "2件目の投稿文", "..."],
  "finalCta": "最後の投稿に含める誘導文言（ブログ/note/アフィリエイトリンク等への誘導）"
}`,
};
