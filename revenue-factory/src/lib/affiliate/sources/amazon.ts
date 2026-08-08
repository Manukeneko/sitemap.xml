import type { AffiliateSource } from "@/lib/affiliate/types";

// Amazon PA-API (Product Advertising API v5) は AWS4-HMAC-SHA256 署名が必要で、かつ
// 一定の成約実績がないと利用継続できないという制約があるため、Phase4時点ではまだ
// 実装していない（DESIGN.md §3, §16 バックログ）。isConfigured() を常に false にして
// 未実装であることを明示し、検証していない署名ロジックを実装だけして動かないコードに
// しないようにしている。実装する際はここに PA-API v5 の SignedRequest を追加する。
export const amazonSource: AffiliateSource = {
  name: "amazon",
  isConfigured() {
    return false;
  },
  async searchItems(): Promise<never[]> {
    return [];
  },
};
