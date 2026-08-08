import { createHash, createHmac } from "crypto";

// Amazon PA-API 5.0 (Product Advertising API) が要求する AWS Signature Version 4 の
// 最小実装。Node標準のcryptoのみを使用し、追加SDKは入れていない。
// 参考: PA-API 5.0はSigV4署名にNode.js SDK等を使わず自前実装するケースが多い
// （公式に軽量な専用SDKが提供されていないため）。仕様: AWS General Reference "SigV4"。
export interface SignedRequestHeaders {
  [key: string]: string;
}

export function signPaApiRequest(params: {
  method: "POST";
  host: string;
  path: string;
  region: string;
  service: string; // ProductAdvertisingAPI
  target: string; // 例: com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems
  accessKey: string;
  secretKey: string;
  body: string;
  /** テスト用。省略時は現在時刻を使う */
  date?: Date;
}): SignedRequestHeaders {
  const now = params.date ?? new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ""); // YYYYMMDDTHHMMSSZ
  const dateStamp = amzDate.slice(0, 8);

  const headers: Record<string, string> = {
    "content-encoding": "amz-1.0",
    "content-type": "application/json; charset=utf-8",
    host: params.host,
    "x-amz-date": amzDate,
    "x-amz-target": params.target,
  };

  const sortedHeaderNames = Object.keys(headers).sort();
  const canonicalHeaders = sortedHeaderNames.map((k) => `${k}:${headers[k]}\n`).join("");
  const signedHeaders = sortedHeaderNames.join(";");
  const payloadHash = createHash("sha256").update(params.body, "utf8").digest("hex");

  const canonicalRequest = [
    params.method,
    params.path,
    "", // query string
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${params.region}/${params.service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    createHash("sha256").update(canonicalRequest, "utf8").digest("hex"),
  ].join("\n");

  const kDate = createHmac("sha256", `AWS4${params.secretKey}`).update(dateStamp).digest();
  const kRegion = createHmac("sha256", kDate).update(params.region).digest();
  const kService = createHmac("sha256", kRegion).update(params.service).digest();
  const kSigning = createHmac("sha256", kService).update("aws4_request").digest();
  const signature = createHmac("sha256", kSigning).update(stringToSign).digest("hex");

  const authorization = `AWS4-HMAC-SHA256 Credential=${params.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return { ...headers, Authorization: authorization };
}
