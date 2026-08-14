import type { AffiliateItem, AffiliateSource } from "@/lib/affiliate/types";

// 楽天ウェブサービス「楽天市場商品検索API」(IchibaItem/Search) を利用した
// 実在の商品検索コネクタ。
//
// 2026年2月〜5月に楽天ウェブサービスの新API基盤への移行が行われ、旧エンドポイント
// (app.rakuten.co.jp/services/api/...) は2026-05-14に完全停止した。新基盤では
// アプリケーションID(applicationId)に加えて、
//   - アクセスキー（accessKeyクエリパラメータ。実クレデンシャルでの動作確認により、
//     Authorization: Bearerヘッダーでは"accessKey must be present as a query parameter
//     or in the header"[400]エラーになることを確認済み。クエリパラメータ形式が正）
//   - Referer/Origin ヘッダー（アプリ登録時の「許可されたWebサイト」と一致させる必要あり。
//     無くても現時点では動作するが、公式仕様に沿って常に送る）
// が必須になっている。
//
// エンドポイントのバージョン識別子(末尾のYYYYMMDD)は、公式ドキュメント
// (webservice.rakuten.co.jp/documentation/ichiba-item-search)で確認した最新版
// 20260701 を使用する（実クレデンシャルでのライブテストで、存在しない旧バージョンだと
// "API Configuration not found"[400 wrong_parameter]になることを確認済み）。
// RAKUTEN_API_BASE_URL で上書き可能（将来さらにバージョンが変わった場合の保険）。
//
// RAKUTEN_APP_ID / RAKUTEN_ACCESS_KEY が未設定の場合は空配列を返す。
// 実クレデンシャルでの動作確認済み(2026-08-13、keyword=掃除機フィルター で
// count=4385 items=10 の実商品データ取得を確認)。
const DEFAULT_BASE_URL = "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701";

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
    url.searchParams.set("accessKey", accessKey);
    url.searchParams.set("hits", "10");
    url.searchParams.set("sort", "-reviewCount"); // レビューが多い=一定の販売実績がある商品を優先
    if (affiliateId) url.searchParams.set("affiliateId", affiliateId);

    const headers: Record<string, string> = {};
    if (refererUrl) {
      headers.Referer = refererUrl;
      headers.Origin = new URL(refererUrl).origin;
    } else {
      console.warn(
        "[rakutenSource] RAKUTEN_REFERER_URL is not set. The Rakuten API may reject requests without a Referer header matching the registered application URL (HTTP_REFERRER_MISSING)."
      );
    }

    try {
      const res = await fetch(url.toString(), { headers });
      const rawText = await res.text();
      if (!res.ok) {
        console.warn(`[rakutenSource] API error: ${res.status} ${rawText.slice(0, 300)}`);
        return [];
      }
      const json = JSON.parse(rawText) as {
        count?: number;
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
      console.log(
        `[rakutenSource] success: status=${res.status} count=${json.count ?? "?"} items=${(json.Items ?? []).length}`
      );
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
