"use client";

import { useState } from "react";
import type { Topic, Content } from "@prisma/client";

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

export function TopicTable({ topics }: { topics: Topic[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [contentsByTopic, setContentsByTopic] = useState<Record<string, Content[]>>({});
  const [planningId, setPlanningId] = useState<string | null>(null);

  async function toggleExpand(topicId: string) {
    if (expandedId === topicId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(topicId);
    if (!contentsByTopic[topicId]) {
      const res = await fetch(`/api/topics/${topicId}`);
      if (res.ok) {
        const json = await res.json();
        setContentsByTopic((prev) => ({ ...prev, [topicId]: json.topic.contents }));
      }
    }
  }

  async function runPlan(topicId: string) {
    setPlanningId(topicId);
    try {
      const res = await fetch(`/api/topics/${topicId}/plan`, { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setContentsByTopic((prev) => ({ ...prev, [topicId]: json.contents }));
        setExpandedId(topicId);
      } else {
        alert(json.error ?? "企画生成に失敗しました");
      }
    } finally {
      setPlanningId(null);
    }
  }

  if (topics.length === 0) {
    return <div className="empty">まだテーマがありません。上のフォームから市場調査を実行してください。</div>;
  }

  return (
    <div>
      {topics.map((topic) => (
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

              <div style={{ marginTop: 14 }}>
                <button
                  className="secondary"
                  disabled={planningId === topic.id}
                  onClick={() => runPlan(topic.id)}
                >
                  {planningId === topic.id ? "企画生成中..." : "コンテンツ企画を生成"}
                </button>
              </div>

              {contentsByTopic[topic.id] && contentsByTopic[topic.id].length > 0 && (
                <div className="content-list">
                  {contentsByTopic[topic.id].map((c) => (
                    <div key={c.id} className="content-item">
                      <div className="platform-tag">{c.platform}</div>
                      <div className="title">{c.title}</div>
                      <div className="outline">{c.body}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
