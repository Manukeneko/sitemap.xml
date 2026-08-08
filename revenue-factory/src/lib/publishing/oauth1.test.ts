import { describe, expect, it } from "vitest";
import { buildOAuth1Header, percentEncode } from "@/lib/publishing/oauth1";

describe("percentEncode", () => {
  it("encodes RFC 3986 reserved characters that encodeURIComponent leaves untouched", () => {
    expect(percentEncode("!*'()")).toBe("%21%2A%27%28%29");
  });

  it("encodes spaces as %20, not +", () => {
    expect(percentEncode("hello world")).toBe("hello%20world");
  });
});

describe("buildOAuth1Header", () => {
  const baseParams = {
    method: "POST",
    url: "https://api.twitter.com/2/tweets",
    consumerKey: "ck",
    consumerSecret: "cs",
    token: "tok",
    tokenSecret: "toks",
    nonce: "fixed-nonce",
    timestamp: "1700000000",
  };

  it("produces a well-formed OAuth authorization header with all required fields", () => {
    const header = buildOAuth1Header(baseParams);
    expect(header.startsWith("OAuth ")).toBe(true);
    for (const key of [
      "oauth_consumer_key",
      "oauth_nonce",
      "oauth_signature",
      "oauth_signature_method",
      "oauth_timestamp",
      "oauth_token",
      "oauth_version",
    ]) {
      expect(header).toContain(`${key}=`);
    }
    expect(header).toContain('oauth_signature_method="HMAC-SHA1"');
    expect(header).toContain('oauth_nonce="fixed-nonce"');
    expect(header).toContain('oauth_timestamp="1700000000"');
  });

  it("is deterministic for identical inputs (same nonce/timestamp)", () => {
    const header1 = buildOAuth1Header(baseParams);
    const header2 = buildOAuth1Header(baseParams);
    expect(header1).toBe(header2);
  });

  it("changes the signature when the secret changes", () => {
    const header1 = buildOAuth1Header(baseParams);
    const header2 = buildOAuth1Header({ ...baseParams, consumerSecret: "different-secret" });
    expect(header1).not.toBe(header2);
  });

  it("changes the signature when the URL changes", () => {
    const header1 = buildOAuth1Header(baseParams);
    const header2 = buildOAuth1Header({ ...baseParams, url: "https://api.twitter.com/2/other" });
    expect(header1).not.toBe(header2);
  });
});
