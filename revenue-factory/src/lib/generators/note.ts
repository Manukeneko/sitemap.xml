import type { ContentGeneratorSpec, GeneratorContext } from "@/lib/generators/types";

const baseInfo = (ctx: GeneratorContext) => `テーマ: ${ctx.topicTitle}（カテゴリ: ${ctx.topicCategory}）
企画タイトル: ${ctx.planTitle}
企画構成案: ${ctx.planOutline}`;

export const noteFreeSpec: ContentGeneratorSpec = {
  platform: "note_free",
  label: "note無料記事",
  taskKind: "long_form_script",
  contentType: "article",
  systemPrompt:
    "あなたはnote記事の作成AIです。無料記事として読者に価値を提供しつつ、有料コンテンツやシリーズへ自然に興味を持たせる文章を作成してください。",
  buildPrompt: (ctx) => `${baseInfo(ctx)}

以下のJSON形式でnote無料記事を作成してください（Markdown形式の本文）。
{
  "title": "記事タイトル",
  "body": "本文（Markdown、見出し・箇条書きを適宜使用）",
  "paidTeaser": "文末に置く、有料記事やシリーズへの自然な誘導文"
}`,
};

export const notePaidSpec: ContentGeneratorSpec = {
  platform: "note_paid",
  label: "note有料記事",
  taskKind: "long_form_script",
  contentType: "article",
  systemPrompt:
    "あなたはnote有料記事の作成AIです。無料部分で価値と信頼を示し、有料部分でしか得られない具体的な情報・ノウハウを提供する構成にしてください。",
  buildPrompt: (ctx) => `${baseInfo(ctx)}

以下のJSON形式でnote有料記事を作成してください。
{
  "title": "記事タイトル",
  "freePreview": "無料公開部分（Markdown、読者の興味を引き購入したくなる内容）",
  "paidBody": "有料部分（Markdown、具体的で実用的な内容）",
  "suggestedPriceJpy": 500
}`,
};
