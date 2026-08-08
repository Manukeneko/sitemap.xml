import { describe, expect, it } from "vitest";
import { signPaApiRequest } from "@/lib/affiliate/awsSigV4";

describe("signPaApiRequest", () => {
  const baseParams = {
    method: "POST" as const,
    host: "webservices.amazon.co.jp",
    path: "/paapi5/searchitems",
    region: "us-west-2",
    service: "ProductAdvertisingAPI",
    target: "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems",
    accessKey: "AKIDEXAMPLE",
    secretKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
    body: JSON.stringify({ Keywords: "test" }),
    date: new Date("2026-01-15T12:00:00.000Z"),
  };

  it("includes the required PA-API headers", () => {
    const headers = signPaApiRequest(baseParams);
    expect(headers["content-encoding"]).toBe("amz-1.0");
    expect(headers["content-type"]).toBe("application/json; charset=utf-8");
    expect(headers.host).toBe(baseParams.host);
    expect(headers["x-amz-target"]).toBe(baseParams.target);
    expect(headers["x-amz-date"]).toBe("20260115T120000Z");
  });

  it("builds an Authorization header with the AWS4-HMAC-SHA256 scheme and correct credential scope", () => {
    const headers = signPaApiRequest(baseParams);
    expect(headers.Authorization).toMatch(/^AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE\//);
    expect(headers.Authorization).toContain("20260115/us-west-2/ProductAdvertisingAPI/aws4_request");
    expect(headers.Authorization).toContain(
      "SignedHeaders=content-encoding;content-type;host;x-amz-date;x-amz-target"
    );
    expect(headers.Authorization).toMatch(/Signature=[0-9a-f]{64}$/);
  });

  it("is deterministic for identical inputs (same fixed date)", () => {
    const headers1 = signPaApiRequest(baseParams);
    const headers2 = signPaApiRequest(baseParams);
    expect(headers1.Authorization).toBe(headers2.Authorization);
  });

  it("changes the signature when the request body changes", () => {
    const headers1 = signPaApiRequest(baseParams);
    const headers2 = signPaApiRequest({ ...baseParams, body: JSON.stringify({ Keywords: "other" }) });
    expect(headers1.Authorization).not.toBe(headers2.Authorization);
  });

  it("changes the signature when the secret key changes", () => {
    const headers1 = signPaApiRequest(baseParams);
    const headers2 = signPaApiRequest({ ...baseParams, secretKey: "different-secret-key-value" });
    expect(headers1.Authorization).not.toBe(headers2.Authorization);
  });
});
