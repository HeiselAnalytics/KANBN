import { describe, expect, it } from "vitest";

import { DEFAULT_OVERVIEW_FILTERS, matchesOverviewFilters, NO_COLOR_FILTER, NO_SECTION_FILTER, parseOverviewFilters, sortOverviewCards } from "@/lib/overview";
import type { OverviewCardData } from "@/lib/types";

const NOW = new Date("2026-08-26T10:00:00Z").getTime();

function card(overrides: Partial<OverviewCardData> = {}): OverviewCardData {
  return {
    publicId: "crd_1",
    listPublicId: "lst_1",
    title: "Prepare launch",
    description: "Release checklist",
    position: 1,
    dueDate: "2026-08-30T10:00:00Z",
    color: null,
    labels: [{ publicId: "lbl_release", name: "Release", color: "#FFAA00" }],
    checklists: [],
    comments: [],
    activity: [],
    boardPublicId: "brd_product",
    boardName: "Product",
    sectionPublicId: "sec_work",
    sectionName: "Work",
    listName: "TODO",
    ...overrides,
  };
}

describe("overview filters", () => {
  it("defaults to cards due within the next 14 days", () => {
    expect(matchesOverviewFilters(card(), DEFAULT_OVERVIEW_FILTERS, NOW)).toBe(true);
    expect(matchesOverviewFilters(card({ dueDate: "2026-09-20T10:00:00Z" }), DEFAULT_OVERVIEW_FILTERS, NOW)).toBe(false);
    expect(matchesOverviewFilters(card({ dueDate: "2026-08-25T10:00:00Z" }), DEFAULT_OVERVIEW_FILTERS, NOW)).toBe(false);
  });

  it("combines origin, board, label and text selections", () => {
    const filters = { ...DEFAULT_OVERVIEW_FILTERS, due: "all" as const, search: "release", sections: ["sec_work"], boards: ["brd_product"], labels: ["lbl_release"] };
    expect(matchesOverviewFilters(card(), filters, NOW)).toBe(true);
    expect(matchesOverviewFilters(card({ sectionPublicId: null, sectionName: null }), { ...filters, sections: [NO_SECTION_FILTER] }, NOW)).toBe(true);
    expect(matchesOverviewFilters(card({ boardPublicId: "brd_other" }), filters, NOW)).toBe(false);
  });

  it("filters by global card colors and cards without a color", () => {
    const priority = { publicId: "clr_priority", name: "Priority", color: "#DF3F3F" };
    const filters = { ...DEFAULT_OVERVIEW_FILTERS, due: "all" as const, colors: [priority.publicId] };
    expect(matchesOverviewFilters(card({ color: priority }), filters, NOW)).toBe(true);
    expect(matchesOverviewFilters(card(), filters, NOW)).toBe(false);
    expect(matchesOverviewFilters(card(), { ...filters, colors: [NO_COLOR_FILTER] }, NOW)).toBe(true);
  });

  it("recovers safe values from persisted filter data", () => {
    expect(parseOverviewFilters({ due: "invalid", search: 3, boards: ["brd_1", 4] })).toEqual({ ...DEFAULT_OVERVIEW_FILTERS, boards: ["brd_1"] });
  });

  it("sorts scheduled cards first by due date", () => {
    const cards = [card({ publicId: "none", dueDate: null }), card({ publicId: "later", dueDate: "2026-09-02T10:00:00Z" }), card({ publicId: "first", dueDate: "2026-08-27T10:00:00Z" })];
    expect(cards.sort(sortOverviewCards).map((entry) => entry.publicId)).toEqual(["first", "later", "none"]);
  });
});
