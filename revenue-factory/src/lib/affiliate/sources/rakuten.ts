import type { AffiliateItem, AffiliateSource } from "@/lib/affiliate/types";

// 楽天ウェブサービス「楽天市場商品検索API」(IchibaItem/Search) を利用した
// 実在の商品検索コネクタ。RAKUTEN_APP_ID が未設定の場合は空配列を返す。
// アフィリエイトリンクとして使う場合は、別途楽天アフィリエイトのafiliateId設定と
// 各種表示義務（広告である旨の明記等）を遵守すること（DESIGN.md §12）。
export const rakutenSource: AffiliateSource = {
  name: "rakuten",
  isConfigured() {
    return Boolean(process.env.RAKUTEN_APP_ID);
  },
  async searchItems(keyword: string): Promise<AffiliateItem[]> {
    const appId = process.env.RAKUTEN_APP_ID;
    if (!appId || !keyword) return [];

    const url = new URL("https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601");
    url.searchParams.set("format", "json");
    url.searchParams.set("keyword", keyword);
    url.searchParams.set("applicationId", appId);
    url.searchParams.set("hits", "10");
    url.searchParams.set("sort", "-reviewCount"); // レビューが多い=一定の販売実績がある商品を優先

    try {
      const res = await fetch(url.toString());
      if (!res.ok) {
        console.warn(`[rakutenSource] API error: ${res.status}`);
        return [];
      }
      const json = (await res.json()) as {
        Items?: Array<{
          Item: {
            itemName: string;
            itemPrice: number;
            itemUrl: string;
            affiliateUrl?: string;
            mediumImageUrls?: Array<{ imageUrl: string }>;
          };
        }>;
      };
      return (json.Items ?? []).map(({ Item }) => ({
        source: "rakuten",
        name: Item.itemName,
        price: Item.itemPrice,
        url: Item.affiliateUrl || Item.itemUrl,
        imageUrl: Item.mediumImageUrls?.[0]?.imageUrl,
      }));
    } catch (err) {
      console.warn("[rakutenSource] fetch failed", err);
      return [];
    }
  },
};
