import { describe, expect, it } from "vitest";

import { rankAfter, rankBetween, RANK_STEP } from "@/lib/rank";

describe("fractional ranks", () => {
  it("appends with a stable gap", () => {
    expect(rankAfter()).toBe(RANK_STEP);
    expect(rankAfter(2048)).toBe(3072);
  });

  it("inserts between neighbours without rewriting them", () => {
    expect(rankBetween(1024, 2048)).toBe(1536);
    expect(rankBetween(null, 1024)).toBe(0);
    expect(rankBetween(1024, null)).toBe(2048);
  });
});
