"use client";

import { useEffect, useState } from "react";
import type { Topic } from "@prisma/client";
import { StatCard } from "@/components/StatCard";
import { TopicTable } from "@/components/TopicTable";

interface Stats {
  topicsToday: number;
  contentsToday: number;
  aiCostTodayUsd: number;
  aiCostTotalUsd: number;
  topTopic: Topic | null;
}

export default function Home() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [seed, setSeed] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadAll() {
    const [topicsRes, statsRes] = await Promise.all([fetch("/api/topics"), fetch("/api/stats")]);
    if (topicsRes.ok) setTopics((await topicsRes.json()).topics);
    if (statsRes.ok) setStats(await statsRes.json());
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function runResearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/research/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seed: seed || undefined, category: category || undefined, count: 5 }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "市場調査に失敗しました");
        return;
      }
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>AI収益工場 — 司令塔ダッシュボード</h1>
      <div className="subtitle">Phase 1: 市場調査 → 収益性スコアリング → コンテンツ企画</div>

      {error && <div className="error-banner">{error}</div>}

      <div className="stat-grid">
        <StatCard label="今日のテーマ発掘数" value={String(stats?.topicsToday ?? "-")} />
        <StatCard label="今日の企画コンテンツ数" value={String(stats?.contentsToday ?? "-")} />
        <StatCard
          label="今日のAIコスト"
          value={stats ? `$${stats.aiCostTodayUsd.toFixed(4)}` : "-"}
        />
        <StatCard
          label="累計AIコスト"
          value={stats ? `$${stats.aiCostTotalUsd.toFixed(4)}` : "-"}
        />
        <StatCard
          label="最も収益期待値が高いテーマ"
          value={stats?.topTopic ? stats.topTopic.title : "-"}
        />
      </div>

      <section className="panel">
        <h2>市場調査AIを実行</h2>
        <form className="research-form" onSubmit={runResearch}>
          <input
            placeholder="ジャンル（例: ガジェット、AI、副業）"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <input
            placeholder="注目キーワード（任意、例: Mac mini SSD）"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
          />
          <button type="submit" disabled={loading}>
            {loading ? "調査中..." : "今日のテーマを発掘する"}
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>テーマランキング（収益期待値順）</h2>
        <TopicTable topics={topics} />
      </section>
    </main>
  );
}
