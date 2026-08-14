import type { Signal, SignalSource } from "@/lib/research/types";

// YouTube Data API v3 (search.list) を用いた簡易トレンド調査ソース。
// 無料枠: 1日1万クォータユニット（search.listは1回100ユニット消費）。
// YOUTUBE_API_KEY が未設定の場合は何もせず空配列を返す（DESIGN.md §11.2）。
export const youtubeSource: SignalSource = {
  name: "youtube",
  isConfigured() {
    return Boolean(process.env.YOUTUBE_API_KEY);
  },
  async fetchSignals(seed?: string): Promise<Signal[]> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey || !seed) return [];

    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("q", seed);
    url.searchParams.set("type", "video");
    url.searchParams.set("order", "viewCount");
    url.searchParams.set("maxResults", "10");
    url.searchParams.set("key", apiKey);

    try {
      const res = await fetch(url.toString());
      if (!res.ok) {
        console.warn(`[youtubeSource] YouTube API error: ${res.status}`);
        return [];
      }
      const json = (await res.json()) as {
        items?: Array<{ id: { videoId: string }; snippet: { title: string; channelTitle: string } }>;
      };
      return (json.items ?? []).map((item) => ({
        source: "youtube",
        label: item.snippet.title,
        detail: `channel: ${item.snippet.channelTitle}`,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      }));
    } catch (err) {
      console.warn("[youtubeSource] fetch failed", err);
      return [];
    }
  },
};
