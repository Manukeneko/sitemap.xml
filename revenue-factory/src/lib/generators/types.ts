import type { TaskKind } from "@/lib/ai/router";

// コンテンツ企画AI（企画レベル）の次段階として、媒体ごとに台本・原稿レベルまで
// 詳細化するのが Phase2 の各媒体AI（YouTube AI / Instagram AI / ... 、DESIGN.md §10）。

export interface GeneratorContext {
  topicTitle: string;
  topicCategory: string;
  planTitle: string; // コンテンツ企画AIが作った企画タイトル
  planOutline: string; // コンテンツ企画AIが作った構成案
}

// 生成結果は媒体ごとに形が異なるため unknown で保持し、Content.body にJSON文字列として保存する。
export interface GeneratedDetail {
  [key: string]: unknown;
}

export interface ContentGeneratorSpec {
  platform: string; // Content.platform と一致させる
  label: string;
  taskKind: TaskKind; // AI Routerでのモデル選定に使用（長文=long_form_script, 大量短文=short_copy）
  contentType: string; // 生成後にContent.contentTypeへ反映する値
  systemPrompt: string;
  buildPrompt: (ctx: GeneratorContext) => string;
}
