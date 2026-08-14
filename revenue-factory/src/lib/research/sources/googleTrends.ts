import type { Signal, SignalSource } from "@/lib/research/types";

// Googleトレンドの公式APIは存在しないため、正規の利用規約に基づき提供される
// SerpApi (https://serpapi.com/) のGoogle Trendsエンジンを利用する（有料/無料枠あり）。
// SERPAPI_KEY が未設定の場合は何もせず空配列を返す。DESIGN.md §3, §11.2 参照。
export const googleTrendsSource: SignalSource = {
  name: "google_trends",
  isConfigured() {
    return Boolean(process.env.SERPAPI_KEY);
  },
  async fetchSignals(seed?: string): Promise<Signal[]> {
    const apiKey = process.env.SERPAPI_KEY;
    if (!apiKey || !seed) return [];

    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.set("engine", "google_trends");
    url.searchParams.set("q", seed);
    url.searchParams.set("data_type", "RELATED_QUERIES");
    url.searchParams.set("api_key", apiKey);

    try {
      const res = await fetch(url.toString());
      if (!res.ok) {
        console.warn(`[googleTrendsSource] SerpApi error: ${res.status}`);
        return [];
      }
      const json = (await res.json()) as {
        related_queries?: { rising?: Array<{ query: string; value?: number }> };
      };
      return (json.related_queries?.rising ?? []).map((item) => ({
        source: "google_trends",
        label: item.query,
        score: typeof item.value === "number" ? Math.min(100, item.value) : undefined,
        detail: "rising related query",
      }));
    } catch (err) {
      console.warn("[googleTrendsSource] fetch failed", err);
      return [];
    }
  },
};
