// AI選択ルーター（DESIGN.md §11.4）
// タスク種別ごとに最適なモデルを選ぶ。Phase1はClaude内のモデル切替のみ。
// Phase3以降、画像/音声/動画や他社モデルとのコスト比較ロジックをここに追加する。

export type TaskKind =
  | "research_summarize"
  | "scoring"
  | "planning"
  | "long_form_script"
  | "short_copy";

export interface RouteDecision {
  provider: "anthropic";
  model: string;
}

const TASK_MODEL_MAP: Record<TaskKind, string> = {
  research_summarize: "claude-sonnet-5",
  scoring: "claude-sonnet-5",
  planning: "claude-sonnet-5",
  long_form_script: "claude-sonnet-5",
  short_copy: "claude-haiku-4-5",
};

export function routeTask(kind: TaskKind): RouteDecision {
  return { provider: "anthropic", model: TASK_MODEL_MAP[kind] };
}
