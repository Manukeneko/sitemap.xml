export interface AffiliateItem {
  source: string; // "rakuten" | "amazon" | ...
  name: string;
  price?: number;
  commissionRate?: number; // % (取得できる場合のみ)
  url: string;
  imageUrl?: string;
}

export interface AffiliateSource {
  name: string;
  isConfigured(): boolean;
  searchItems(keyword: string): Promise<AffiliateItem[]>;
}
