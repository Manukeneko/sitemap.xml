"use client";

export interface RoiRow {
  topicId: string;
  title: string;
  status: string;
  aiCostUsd: number;
  aiCostJpy: number;
  revenueJpy: number;
  profitJpy: number;
  isLoss: boolean;
}

export function RoiPanel({ roi, onChanged }: { roi: RoiRow[]; onChanged: () => void }) {
  async function archive(topicId: string) {
    if (!confirm("収益がAIコストを下回っているこのテーマを停止しますか？")) return;
    const res = await fetch(`/api/topics/${topicId}/archive`, { method: "POST" });
    if (res.ok) onChanged();
  }

  const withCost = roi.filter((r) => r.aiCostJpy > 0);

  if (withCost.length === 0) {
    return (
      <div className="empty">
        まだAIコストが発生したテーマがありません。企画・詳細生成を実行するとここにROIが表示されます。
      </div>
    );
  }

  return (
    <div className="content-list">
      {withCost.map((r) => (
        <div key={r.topicId} className="content-item">
          <div className="platform-tag" style={{ color: r.isLoss ? "var(--bad)" : "var(--good)" }}>
            {r.status} ・ {r.isLoss ? "赤字" : "黒字/収支ゼロ"}
          </div>
          <div className="title">{r.title}</div>
          <div className="outline">
            AIコスト: ¥{r.aiCostJpy.toFixed(1)}（${r.aiCostUsd.toFixed(4)}） ／ 収益: ¥
            {r.revenueJpy.toFixed(0)} ／ 損益: ¥{r.profitJpy.toFixed(1)}
          </div>
          {r.isLoss && r.status !== "archived" && (
            <div style={{ marginTop: 8 }}>
              <button className="secondary" onClick={() => archive(r.topicId)}>
                このテーマを停止する
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
