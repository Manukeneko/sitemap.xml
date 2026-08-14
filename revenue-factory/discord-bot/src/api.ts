// AI収益工場ダッシュボード（Next.jsアプリ）のREST APIを呼び出す薄いクライアント。
// ビジネスロジックはダッシュボード側に一本化し、ここでは二重実装しない（DESIGN.md §15）。

const BASE_URL = process.env.DASHBOARD_API_BASE_URL ?? "http://localhost:3000";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(json.error ?? `API error: ${res.status} ${path}`);
  }
  return json as T;
}

export interface Topic {
  id: string;
  title: string;
  category: string;
  totalScore: number;
  status: string;
}

export interface Content {
  id: string;
  title: string;
  platform: string;
  status: string;
  qualityStatus: string;
  topic: { title: string };
}

export interface Stats {
  topicsToday: number;
  contentsToday: number;
  aiCostTodayUsd: number;
  aiCostTotalUsd: number;
  topTopic: Topic | null;
}

export interface RoiRow {
  topicId: string;
  title: string;
  aiCostJpy: number;
  revenueJpy: number;
  profitJpy: number;
  isLoss: boolean;
}

export interface RevenueEntry {
  id: string;
  revenueAmount: number;
  contentId: string | null;
  content: { title: string; platform: string } | null;
}

export function getTopics(): Promise<{ topics: Topic[] }> {
  return apiFetch("/api/topics");
}

export function getStats(): Promise<Stats> {
  return apiFetch("/api/stats");
}

export function getRoi(): Promise<{ roi: RoiRow[] }> {
  return apiFetch("/api/roi");
}

export function getContentsByStatus(status: string): Promise<{ contents: Content[] }> {
  return apiFetch(`/api/contents?status=${encodeURIComponent(status)}`);
}

export function getRevenue(): Promise<{ revenues: RevenueEntry[] }> {
  return apiFetch("/api/revenue");
}

export function runResearch(category?: string): Promise<{ topics: Topic[] }> {
  return apiFetch("/api/research/run", {
    method: "POST",
    body: JSON.stringify({ category, count: 5 }),
  });
}

export function approveContent(contentId: string): Promise<{ content: Content }> {
  return apiFetch(`/api/contents/${contentId}/approve`, { method: "POST" });
}
