"use client";

import { useEffect, useState } from "react";
import type { Topic, Content, Product, MediaAsset } from "@prisma/client";

type ContentWithMedia = Content & { mediaAssets?: MediaAsset[] };

const SCORE_FIELDS: Array<{ key: keyof Topic; label: string }> = [
  { key: "searchDemand", label: "検索需要" },
  { key: "snsDemand", label: "SNS需要" },
  { key: "trendScore", label: "トレンド性" },
  { key: "competition", label: "競合度" },
  { key: "affiliateScore", label: "アフィリエイト" },
  { key: "productScore", label: "商品化" },
  { key: "videoFit", label: "動画化" },
  { key: "seoFit", label: "SEO適性" },
  { key: "continuity", label: "継続性" },
];

const STATUS_LABELS: Record<string, string> = {
  draft: "企画のみ",
  review: "詳細生成済み・要確認",
  flagged: "品質チェックで指摘あり",
  approved: "承認済み",
  scheduled: "投稿予定",
  published: "投稿済み",
  failed: "失敗",
};

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

const QUALITY_LABELS: Record<string, string> = {
  unchecked: "品質未チェック",
  passed: "品質チェック合格",
  flagged: "品質チェックで指摘あり",
};

// draft(企画outline)はプレーンテキスト、生成済みはJSON文字列なので整形して表示する
function renderBody(body: string, status: string): string {
  if (status === "draft") return body;
  try {
    const parsed = JSON.parse(body);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return body;
  }
}

interface TopicDetail {
  contents: ContentWithMedia[];
  products: Product[];
}

export function TopicTable({ topics: initialTopics }: { topics: Topic[] }) {
  const [topics, setTopics] = useState(initialTopics);

  useEffect(() => {
    setTopics(initialTopics);
  }, [initialTopics]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailByTopic, setDetailByTopic] = useState<Record<string, TopicDetail>>({});
  const [planningId, setPlanningId] = useState<string | null>(null);
  const [affiliateBusyId, setAffiliateBusyId] = useState<string | null>(null);
  const [busyContentId, setBusyContentId] = useState<string | null>(null);
  const [exportText, setExportText] = useState<Record<string, string>>({});
  const [revenueInput, setRevenueInput] = useState<Record<string, string>>({});
  const [mediaBusyContentId, setMediaBusyContentId] = useState<string | null>(null);

  // ステータス更新系のAPIはmediaAssetsを含まないContentしか返さないため、
  // 既存のmediaAssetsをマージして表示が消えないようにする
  function replaceContent(topicId: string, updated: ContentWithMedia) {
    setDetailByTopic((prev) => ({
      ...prev,
      [topicId]: {
        ...prev[topicId],
        contents: (prev[topicId]?.contents ?? []).map((c) =>
          c.id === updated.id ? { ...updated, mediaAssets: updated.mediaAssets ?? c.mediaAssets } : c
        ),
      },
    }));
  }

  function addMediaAsset(topicId: string, contentId: string, asset: MediaAsset) {
    setDetailByTopic((prev) => ({
      ...prev,
      [topicId]: {
        ...prev[topicId],
        contents: (prev[topicId]?.contents ?? []).map((c) =>
          c.id === contentId ? { ...c, mediaAssets: [asset, ...(c.mediaAssets ?? [])] } : c
        ),
      },
    }));
  }

  async function generateMedia(topicId: string, contentId: string, kind: "image" | "audio") {
    setMediaBusyContentId(contentId);
    try {
      const res = await fetch(`/api/contents/${contentId}/media/${kind}`, { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        addMediaAsset(topicId, contentId, json.asset);
      } else {
        alert(json.error ?? "メディア生成に失敗しました");
      }
    } finally {
      setMediaBusyContentId(null);
    }
  }

  async function loadDetail(topicId: string) {
    const res = await fetch(`/api/topics/${topicId}`);
    if (res.ok) {
      const json = await res.json();
      setDetailByTopic((prev) => ({
        ...prev,
        [topicId]: { contents: json.topic.contents, products: json.topic.products },
      }));
    }
  }

  async function toggleExpand(topicId: string) {
    if (expandedId === topicId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(topicId);
    if (!detailByTopic[topicId]) {
      await loadDetail(topicId);
    }
  }

  async function runPlan(topicId: string) {
    setPlanningId(topicId);
    try {
      const res = await fetch(`/api/topics/${topicId}/plan`, { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        await loadDetail(topicId);
        setExpandedId(topicId);
      } else {
        alert(json.error ?? "企画生成に失敗しました");
      }
    } finally {
      setPlanningId(null);
    }
  }

  async function runAffiliateSearch(topicId: string) {
    setAffiliateBusyId(topicId);
    try {
      const res = await fetch(`/api/topics/${topicId}/affiliate`, { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        await loadDetail(topicId);
      } else {
        alert(json.error ?? "アフィリエイト商品候補の取得に失敗しました");
      }
    } finally {
      setAffiliateBusyId(null);
    }
  }

  async function archiveTopic(topicId: string) {
    if (!confirm("このテーマを停止（archived）しますか？")) return;
    const res = await fetch(`/api/topics/${topicId}/archive`, { method: "POST" });
    const json = await res.json();
    if (res.ok) {
      setTopics((prev) => prev.map((t) => (t.id === topicId ? json.topic : t)));
    } else {
      alert(json.error ?? "停止に失敗しました");
    }
  }

  async function callContentAction(topicId: string, contentId: string, path: string, body?: unknown) {
    setBusyContentId(contentId);
    try {
      const res = await fetch(`/api/contents/${contentId}/${path}`, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json();
      if (res.ok) {
        if (json.content) replaceContent(topicId, json.content);
        return json;
      } else {
        alert(json.error ?? "処理に失敗しました");
        return null;
      }
    } finally {
      setBusyContentId(null);
    }
  }

  async function loadExport(contentId: string) {
    const res = await fetch(`/api/contents/${contentId}/export`);
    const json = await res.json();
    if (res.ok) {
      setExportText((prev) => ({ ...prev, [contentId]: json.exportedText }));
    }
  }

  // X API等、実Publisherが設定されていれば実際に投稿する。未設定ならコピペ用テキストを表示するだけに留める。
  async function attemptPublish(topicId: string, contentId: string) {
    setBusyContentId(contentId);
    try {
      const res = await fetch(`/api/contents/${contentId}/publish`, { method: "POST" });
      const json = await res.json();
      if (res.ok && json.content) {
        replaceContent(topicId, json.content);
        alert(`投稿しました${json.result?.url ? `: ${json.result.url}` : ""}`);
      } else {
        if (json.exportedText) {
          setExportText((prev) => ({ ...prev, [contentId]: json.exportedText }));
        }
        alert(json.error ?? "投稿に失敗しました");
      }
    } finally {
      setBusyContentId(null);
    }
  }

  async function submitRevenue(topicId: string, contentId: string, platform: string) {
    const raw = revenueInput[contentId];
    const amount = Number(raw);
    if (!raw || Number.isNaN(amount)) {
      alert("金額を数値で入力してください");
      return;
    }
    const res = await fetch("/api/revenue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, contentId, revenueAmount: amount }),
    });
    const json = await res.json();
    if (res.ok) {
      setRevenueInput((prev) => ({ ...prev, [contentId]: "" }));
      alert(`収益 ¥${amount.toLocaleString()} を記録しました`);
    } else {
      alert(json.error ?? "収益の記録に失敗しました");
    }
  }

  if (topics.length === 0) {
    return <div className="empty">まだテーマがありません。上のフォームから市場調査を実行してください。</div>;
  }

  return (
    <div>
      {topics.map((topic) => {
        const detail = detailByTopic[topic.id];
        return (
          <div key={topic.id} className="topic-row">
            <div className="topic-head" onClick={() => toggleExpand(topic.id)}>
              <div>
                <div className="topic-title">{topic.title}</div>
                <div className="topic-meta">
                  {topic.category} ・ {topic.status} ・{" "}
                  {new Date(topic.createdAt).toLocaleString("ja-JP")}
                </div>
              </div>
              <div className="score-badge">{topic.totalScore.toFixed(1)}</div>
            </div>

            {expandedId === topic.id && (
              <>
                <div className="score-bars">
                  {SCORE_FIELDS.map((f) => (
                    <div key={String(f.key)}>
                      <div className="score-bar-label">
                        <span>{f.label}</span>
                        <span>{String(topic[f.key])}</span>
                      </div>
                      <div className="score-bar-track">
                        <div
                          className="score-bar-fill"
                          style={{ width: `${Number(topic[f.key])}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {topic.rationale && <div className="rationale">{topic.rationale}</div>}

                <div style={{ marginTop: 14, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button
                    className="secondary"
                    disabled={planningId === topic.id}
                    onClick={() => runPlan(topic.id)}
                  >
                    {planningId === topic.id ? "企画生成中..." : "コンテンツ企画を生成"}
                  </button>
                  <button
                    className="secondary"
                    disabled={affiliateBusyId === topic.id}
                    onClick={() => runAffiliateSearch(topic.id)}
                  >
                    {affiliateBusyId === topic.id ? "検索中..." : "アフィリエイト商品候補を探す"}
                  </button>
                  {topic.status !== "archived" && (
                    <button className="secondary" onClick={() => archiveTopic(topic.id)}>
                      このテーマを停止
                    </button>
                  )}
                </div>

                {detail && detail.products.length > 0 && (
                  <div className="content-list">
                    {detail.products.map((p) => (
                      <div key={p.id} className="content-item">
                        <div className="platform-tag">{p.category} ・ score {p.score}</div>
                        <div className="title">{p.name}</div>
                        <div className="outline">
                          {p.price ? `¥${p.price.toLocaleString()} ・ ` : ""}
                          {p.url ? (
                            <a href={p.url} target="_blank" rel="noreferrer">
                              {p.url}
                            </a>
                          ) : (
                            "（具体的な商品URLなし・方向性の提案）"
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {detail && detail.contents.length > 0 && (
                  <div className="content-list">
                    {detail.contents.map((c) => (
                      <div key={c.id} className="content-item">
                        <div className="platform-tag">
                          {c.platform} ・ {statusLabel(c.status)} ・ {QUALITY_LABELS[c.qualityStatus] ?? c.qualityStatus}
                        </div>
                        <div className="title">{c.title}</div>
                        <div className="outline">{renderBody(c.body, c.status)}</div>

                        {c.qualityNotes && (c.status === "flagged" || c.qualityStatus === "flagged") && (
                          <div className="outline" style={{ color: "var(--warn)" }}>
                            {renderBody(c.qualityNotes, "review")}
                          </div>
                        )}

                        <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {c.status === "draft" && (
                            <button
                              className="secondary"
                              disabled={busyContentId === c.id}
                              onClick={() => callContentAction(topic.id, c.id, "generate")}
                            >
                              {busyContentId === c.id ? "生成中..." : "詳細生成（台本/原稿）"}
                            </button>
                          )}

                          {(c.status === "review" || c.status === "flagged") && (
                            <button
                              className="secondary"
                              disabled={busyContentId === c.id}
                              onClick={() => callContentAction(topic.id, c.id, "quality-check")}
                            >
                              {busyContentId === c.id ? "チェック中..." : "品質チェックを実行"}
                            </button>
                          )}

                          {c.status === "review" && c.qualityStatus === "passed" && (
                            <button
                              className="secondary"
                              disabled={busyContentId === c.id}
                              onClick={() => callContentAction(topic.id, c.id, "approve")}
                            >
                              {busyContentId === c.id ? "処理中..." : "承認する"}
                            </button>
                          )}

                          {c.status === "approved" && (
                            <>
                              <button
                                className="secondary"
                                disabled={busyContentId === c.id}
                                onClick={() => attemptPublish(topic.id, c.id)}
                              >
                                {busyContentId === c.id ? "処理中..." : "実APIで投稿する（設定時のみ）"}
                              </button>
                              <button
                                className="secondary"
                                disabled={busyContentId === c.id}
                                onClick={() => callContentAction(topic.id, c.id, "schedule")}
                              >
                                投稿予定にする（手動投稿用）
                              </button>
                              <button className="secondary" onClick={() => loadExport(c.id)}>
                                コピペ用テキストを表示
                              </button>
                            </>
                          )}

                          {c.status === "scheduled" && (
                            <>
                              <button
                                className="secondary"
                                disabled={busyContentId === c.id}
                                onClick={() => attemptPublish(topic.id, c.id)}
                              >
                                {busyContentId === c.id ? "処理中..." : "実APIで投稿する（設定時のみ）"}
                              </button>
                              <button
                                className="secondary"
                                disabled={busyContentId === c.id}
                                onClick={() => callContentAction(topic.id, c.id, "mark-published")}
                              >
                                投稿完了にする（手動投稿済みの記録）
                              </button>
                              <button className="secondary" onClick={() => loadExport(c.id)}>
                                コピペ用テキストを表示
                              </button>
                            </>
                          )}

                          {c.status === "published" && (
                            <>
                              {c.publishedUrl && (
                                <a href={c.publishedUrl} target="_blank" rel="noreferrer" className="topic-meta">
                                  投稿を見る
                                </a>
                              )}
                              <input
                                placeholder="収益額(円)"
                                style={{ width: 110 }}
                                value={revenueInput[c.id] ?? ""}
                                onChange={(e) =>
                                  setRevenueInput((prev) => ({ ...prev, [c.id]: e.target.value }))
                                }
                              />
                              <button
                                className="secondary"
                                onClick={() => submitRevenue(topic.id, c.id, c.platform)}
                              >
                                収益を記録
                              </button>
                            </>
                          )}
                        </div>

                        {exportText[c.id] && (
                          <div className="outline" style={{ marginTop: 8 }}>
                            {exportText[c.id]}
                          </div>
                        )}

                        {c.status !== "draft" && (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              <button
                                className="secondary"
                                disabled={mediaBusyContentId === c.id}
                                onClick={() => generateMedia(topic.id, c.id, "image")}
                              >
                                {mediaBusyContentId === c.id ? "生成中..." : "サムネイル画像を生成（要OPENAI_API_KEY）"}
                              </button>
                              <button
                                className="secondary"
                                disabled={mediaBusyContentId === c.id}
                                onClick={() => generateMedia(topic.id, c.id, "audio")}
                              >
                                {mediaBusyContentId === c.id ? "生成中..." : "ナレーション音声を生成（要OPENAI_API_KEY）"}
                              </button>
                            </div>
                            {c.mediaAssets && c.mediaAssets.length > 0 && (
                              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                                {c.mediaAssets.map((asset) =>
                                  asset.kind === "image" ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      key={asset.id}
                                      src={asset.filePath}
                                      alt="生成されたサムネイル"
                                      style={{ maxWidth: 240, borderRadius: 8 }}
                                    />
                                  ) : (
                                    <audio key={asset.id} controls src={asset.filePath} />
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
