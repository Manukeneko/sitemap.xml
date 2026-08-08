import { describe, expect, it } from "vitest";
import { computeTotalScore, type SubScores } from "@/lib/scoring/engine";

function scores(overrides: Partial<SubScores> = {}): SubScores {
  return {
    searchDemand: 0,
    snsDemand: 0,
    trendScore: 0,
    competition: 0,
    affiliateScore: 0,
    productScore: 0,
    videoFit: 0,
    seoFit: 0,
    continuity: 0,
    rationale: "",
    ...overrides,
  };
}

describe("computeTotalScore", () => {
  it("returns 100 when every score is maximal and there is no competition", () => {
    const total = computeTotalScore(
      scores({
        searchDemand: 100,
        snsDemand: 100,
        trendScore: 100,
        competition: 0, // 競合0 = (100-0)*weight で満点寄与
        affiliateScore: 100,
        productScore: 100,
        videoFit: 100,
        seoFit: 100,
        continuity: 100,
      })
    );
    expect(total).toBe(100);
  });

  it("returns 0 when every score is minimal and competition is maximal", () => {
    const total = computeTotalScore(scores({ competition: 100 }));
    expect(total).toBe(0);
  });

  it("weighs competition inversely (low competition raises the score)", () => {
    const highCompetition = computeTotalScore(scores({ competition: 100 }));
    const lowCompetition = computeTotalScore(scores({ competition: 0 }));
    expect(lowCompetition).toBeGreaterThan(highCompetition);
  });

  it("gives affiliateScore and searchDemand/snsDemand more weight than seoFit", () => {
    const withAffiliate = computeTotalScore(scores({ affiliateScore: 100 }));
    const withSeo = computeTotalScore(scores({ seoFit: 100 }));
    expect(withAffiliate).toBeGreaterThan(withSeo);
  });

  it("rounds to one decimal place", () => {
    const total = computeTotalScore(
      scores({ searchDemand: 33, snsDemand: 47, trendScore: 61, affiliateScore: 12 })
    );
    expect(Number.isFinite(total)).toBe(true);
    expect(total).toBe(Math.round(total * 10) / 10);
  });
});
