import type { AffiliateItem, AffiliateSource } from "@/lib/affiliate/types";

// 楽天ウェブサービス「楽天市場商品検索API」(IchibaItem/Search) を利用した
// 実在の商品検索コネクタ。
//
// 2026年2月〜5月に楽天ウェブサービスの新API基盤への移行が行われ、旧エンドポイント
// (app.rakuten.co.jp/services/api/...) は2026-05-14に完全停止した。新基盤では
// アプリケーションID(applicationId)に加えて、
//   - アクセスキー（Authorization: Bearer <accessKey> ヘッダー）
//   - Referer/Origin ヘッダー（アプリ登録時の「許可されたWebサイト」と一致させる必要あり）
// が必須になっている。エンドポイントのパス/バージョンは公式ドキュメント未確認のため
// RAKUTEN_API_BASE_URL で上書きできるようにしてある（デフォルト値が変わっていた場合の保険）。
//
// RAKUTEN_APP_ID / RAKUTEN_ACCESS_KEY が未設定の場合は空配列を返す。
const DEFAULT_BASE_URL = "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20170706";

export const rakutenSource: AffiliateSource = {
  name: "rakuten",
  isConfigured() {
    return Boolean(process.env.RAKUTEN_APP_ID && process.env.RAKUTEN_ACCESS_KEY);
  },
  async searchItems(keyword: string): Promise<AffiliateItem[]> {
    const appId = process.env.RAKUTEN_APP_ID;
    const accessKey = process.env.RAKUTEN_ACCESS_KEY;
    const affiliateId = process.env.RAKUTEN_AFFILIATE_ID;
    const refererUrl = process.env.RAKUTEN_REFERER_URL;
    if (!appId || !accessKey || !keyword) return [];

    const baseUrl = process.env.RAKUTEN_API_BASE_URL || DEFAULT_BASE_URL;
    const url = new URL(baseUrl);
    url.searchParams.set("format", "json");
    url.searchParams.set("keyword", keyword);
    url.searchParams.set("applicationId", appId);
    url.searchParams.set("hits", "10");
    url.searchParams.set("sort", "-reviewCount"); // レビューが多い=一定の販売実績がある商品を優先
    if (affiliateId) url.searchParams.set("affiliateId", affiliateId);

    const headers: Record<string, string> = { Authorization: `Bearer ${accessKey}` };
    if (refererUrl) {
      headers.Referer = refererUrl;
      headers.Origin = new URL(refererUrl).origin;
    } else {
      console.warn(
        "[rakutenSource] RAKUTEN_REFERER_URL is not set. The new Rakuten API rejects requests without a Referer header matching the registered application URL (HTTP_REFERRER_MISSING)."
      );
    }

    try {
      const res = await fetch(url.toString(), { headers });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.warn(`[rakutenSource] API error: ${res.status} ${errText.slice(0, 300)}`);
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
