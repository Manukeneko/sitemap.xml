import type { ContentGeneratorSpec, GeneratorContext } from "@/lib/generators/types";

const baseInfo = (ctx: GeneratorContext) => `テーマ: ${ctx.topicTitle}（カテゴリ: ${ctx.topicCategory}）
企画タイトル: ${ctx.planTitle}
企画構成案: ${ctx.planOutline}`;

export const blogSeoSpec: ContentGeneratorSpec = {
  platform: "blog_seo",
  label: "SEOブログ記事",
  taskKind: "long_form_script",
  contentType: "article",
  systemPrompt:
    "あなたはSEOブログ記事の作成AIです。検索意図を満たす一次情報的な価値を優先し、低品質なAI記事の量産にならないよう、具体性のある本文を作成してください。",
  buildPrompt: (ctx) => `${baseInfo(ctx)}

以下のJSON形式でSEOブログ記事一式を作成してください。
{
  "title": "SEOタイトル（32文字目安）",
  "metaDescription": "メタディスクリプション（120文字目安）",
  "targetKeywords": ["主要キーワード", "関連キーワード"],
  "headings": [
    { "h2": "見出し", "body": "その見出し配下の本文（Markdown）" }
  ],
  "faq": [
    { "question": "想定される質問", "answer": "回答" }
  ],
  "internalLinkSuggestions": ["内部リンクとして推奨するテーマ・記事の案"]
}`,
};
