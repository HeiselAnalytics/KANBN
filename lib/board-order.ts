import type { BoardData } from "./types";

export interface CardMoveResult {
  board: BoardData;
  beforePosition: number | null;
  afterPosition: number | null;
}

export function moveCardOnBoard(board: BoardData, cardPublicId: string, targetListPublicId: string, targetIndex: number): CardMoveResult | null {
  const sourceList = board.lists.find((list) => list.cards.some((card) => card.publicId === cardPublicId));
  const targetList = board.lists.find((list) => list.publicId === targetListPublicId);
  const card = sourceList?.cards.find((item) => item.publicId === cardPublicId);
  if (!sourceList || !targetList || !card) return null;

  const targetCards = targetList.cards.filter((item) => item.publicId !== cardPublicId);
  const insertionIndex = Math.max(0, Math.min(targetIndex, targetCards.length));
  const beforePosition = targetCards[insertionIndex - 1]?.position ?? null;
  const afterPosition = targetCards[insertionIndex]?.position ?? null;
  const nextTargetCards = [...targetCards];
  nextTargetCards.splice(insertionIndex, 0, { ...card, listPublicId: targetListPublicId });

  return {
    board: {
      ...board,
      lists: board.lists.map((list) => {
        if (list.publicId === targetListPublicId) return { ...list, cards: nextTargetCards };
        if (list.publicId === sourceList.publicId) return { ...list, cards: list.cards.filter((item) => item.publicId !== cardPublicId) };
        return list;
      }),
    },
    beforePosition,
    afterPosition,
  };
}
