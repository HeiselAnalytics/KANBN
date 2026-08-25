import { describe, expect, it } from "vitest";

import { moveCardOnBoard } from "@/lib/board-order";
import type { BoardData, CardData } from "@/lib/types";

function card(publicId: string, listPublicId: string, position: number): CardData {
  return { publicId, listPublicId, position, title: publicId, description: "", dueDate: null, color: null, labels: [], checklists: [], comments: [], activity: [] };
}

function board(): BoardData {
  return {
    publicId: "brd_test00001",
    name: "Test",
    updatedAt: new Date(0).toISOString(),
    labels: [],
    colors: [],
    lists: [
      { publicId: "lst_todo00001", name: "TO DO", position: 1024, cards: [card("crd_first0001", "lst_todo00001", 1024), card("crd_second001", "lst_todo00001", 2048)] },
      { publicId: "lst_done00001", name: "DONE", position: 2048, cards: [card("crd_done00001", "lst_done00001", 1024)] },
    ],
  };
}

describe("board card ordering", () => {
  it("moves a card into another list before the hovered card", () => {
    const result = moveCardOnBoard(board(), "crd_second001", "lst_done00001", 0);
    expect(result).not.toBeNull();
    expect(result?.beforePosition).toBeNull();
    expect(result?.afterPosition).toBe(1024);
    expect(result?.board.lists[0].cards.map((entry) => entry.publicId)).toEqual(["crd_first0001"]);
    expect(result?.board.lists[1].cards.map((entry) => entry.publicId)).toEqual(["crd_second001", "crd_done00001"]);
    expect(result?.board.lists[1].cards[0].listPublicId).toBe("lst_done00001");
  });

  it("moves a card to the end without producing invalid neighbours", () => {
    const result = moveCardOnBoard(board(), "crd_first0001", "lst_todo00001", 2);
    expect(result?.beforePosition).toBe(2048);
    expect(result?.afterPosition).toBeNull();
    expect(result?.board.lists[0].cards.map((entry) => entry.publicId)).toEqual(["crd_second001", "crd_first0001"]);
  });
});
