import type { AffiliateItem, AffiliateSource } from "@/lib/affiliate/types";
import { signPaApiRequest } from "@/lib/affiliate/awsSigV4";

// Amazon PA-API 5.0 (SearchItems) の実装。SigV4署名（lib/affiliate/awsSigV4.ts）を用いて
// 直接REST呼び出しする。Associates Programの実績要件により、実際にレスポンスが
// 返るのはアカウントがPA-API利用条件を満たしている場合のみ（DESIGN.md §3, §4）。
// AMAZON_ACCESS_KEY / AMAZON_SECRET_KEY / AMAZON_PARTNER_TAG が未設定なら空配列を返す。
// 日本のマーケットプレイスをデフォルトにしている（AMAZON_HOST/AMAZON_REGION/AMAZON_MARKETPLACEで変更可）。
const HOST = process.env.AMAZON_HOST || "webservices.amazon.co.jp";
const REGION = process.env.AMAZON_REGION || "us-west-2";
const MARKETPLACE = process.env.AMAZON_MARKETPLACE || "www.amazon.co.jp";
const PATH = "/paapi5/searchitems";
const TARGET = "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems";
const SERVICE = "ProductAdvertisingAPI";

interface PaApiSearchItemsResponse {
  SearchResult?: {
    Items?: Array<{
      ASIN: string;
      DetailPageURL: string;
      ItemInfo?: { Title?: { DisplayValue?: string } };
      Offers?: { Listings?: Array<{ Price?: { Amount?: number } }> };
      Images?: { Primary?: { Medium?: { URL?: string } } };
    }>;
  };
  Errors?: Array<{ Code: string; Message: string }>;
}

export const amazonSource: AffiliateSource = {
  name: "amazon",
  isConfigured() {
    return Boolean(
      process.env.AMAZON_ACCESS_KEY && process.env.AMAZON_SECRET_KEY && process.env.AMAZON_PARTNER_TAG
    );
  },
  async searchItems(keyword: string): Promise<AffiliateItem[]> {
    const accessKey = process.env.AMAZON_ACCESS_KEY;
    const secretKey = process.env.AMAZON_SECRET_KEY;
    const partnerTag = process.env.AMAZON_PARTNER_TAG;
    if (!accessKey || !secretKey || !partnerTag || !keyword) return [];

    const body = JSON.stringify({
      Keywords: keyword,
      Resources: ["Images.Primary.Medium", "ItemInfo.Title", "Offers.Listings.Price"],
      PartnerTag: partnerTag,
      PartnerType: "Associates",
      Marketplace: MARKETPLACE,
      ItemCount: 10,
    });

    const headers = signPaApiRequest({
      method: "POST",
      host: HOST,
      path: PATH,
      region: REGION,
      service: SERVICE,
      target: TARGET,
      accessKey,
      secretKey,
      body,
    });

    try {
      const res = await fetch(`https://${HOST}${PATH}`, { method: "POST", headers, body });
      const json = (await res.json()) as PaApiSearchItemsResponse;

      if (!res.ok || json.Errors) {
        console.warn(
          `[amazonSource] PA-API error: ${res.status} ${json.Errors?.map((e) => e.Message).join(", ") ?? ""}`
        );
        return [];
      }

      return (json.SearchResult?.Items ?? []).map((item) => ({
        source: "amazon",
        name: item.ItemInfo?.Title?.DisplayValue ?? item.ASIN,
        price: item.Offers?.Listings?.[0]?.Price?.Amount,
        url: item.DetailPageURL,
        imageUrl: item.Images?.Primary?.Medium?.URL,
      }));
    } catch (err) {
      console.warn("[amazonSource] fetch failed", err);
      return [];
    }
  },
};
