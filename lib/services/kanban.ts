import { and, asc, desc, eq, inArray, isNull, sql as drizzleSql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  boardSections,
  boards,
  cardActivity,
  cardColors,
  cardLabels,
  cards,
  checklistItems,
  checklists,
  comments,
  labels,
  lists,
  settings,
  templates,
  type TemplateData,
} from "@/lib/db/schema";
import { createPublicId } from "@/lib/public-id";
import { rankAfter, rankBetween, RANK_STEP } from "@/lib/rank";
import type { AppSettings, BoardData, BoardSectionSummary, BoardSummary, OverviewData, TemplateSummary } from "@/lib/types";
import type { Backup } from "@/lib/validation/backup";

const DEFAULT_SETTINGS: AppSettings = {
  applicationName: "KANBN",
  logoLightUrl: "",
  logoDarkUrl: "",
  defaultBoard: "",
  language: "en",
  dateFormat: "dd.MM.yyyy",
  theme: "system",
  compactCards: false,
};

function iso(value: Date): string {
  return value.toISOString();
}

export async function listBoards(): Promise<BoardSummary[]> {
  const rows = await db
    .select({ publicId: boards.publicId, name: boards.name, sectionPublicId: boardSections.publicId })
    .from(boards)
    .leftJoin(boardSections, eq(boards.sectionId, boardSections.id))
    .where(isNull(boards.deletedAt))
    .orderBy(asc(boards.position));
  return rows;
}

export async function listBoardSections(): Promise<BoardSectionSummary[]> {
  return db
    .select({ publicId: boardSections.publicId, name: boardSections.name, icon: boardSections.icon, position: boardSections.position })
    .from(boardSections)
    .orderBy(asc(boardSections.position));
}

export async function getOverview(): Promise<OverviewData> {
  const [boardRows, sectionRows, listRows, colorRows, labelRows, cardRows] = await Promise.all([
    listBoards(),
    listBoardSections(),
    db
      .select({ publicId: lists.publicId, name: lists.name, boardPublicId: boards.publicId, boardName: boards.name })
      .from(lists)
      .innerJoin(boards, eq(lists.boardId, boards.id))
      .where(and(isNull(lists.deletedAt), isNull(boards.deletedAt)))
      .orderBy(asc(boards.position), asc(lists.position)),
    db.select().from(cardColors).orderBy(asc(cardColors.name)),
    db.select().from(labels).orderBy(asc(labels.name)),
    db
      .select({
        id: cards.id,
        publicId: cards.publicId,
        listPublicId: lists.publicId,
        listName: lists.name,
        title: cards.title,
        description: cards.description,
        position: cards.position,
        dueDate: cards.dueDate,
        boardPublicId: boards.publicId,
        boardName: boards.name,
        sectionPublicId: boardSections.publicId,
        sectionName: boardSections.name,
        colorPublicId: cardColors.publicId,
        colorName: cardColors.name,
        colorValue: cardColors.color,
      })
      .from(cards)
      .innerJoin(lists, eq(cards.listId, lists.id))
      .innerJoin(boards, eq(lists.boardId, boards.id))
      .leftJoin(boardSections, eq(boards.sectionId, boardSections.id))
      .leftJoin(cardColors, eq(cards.colorId, cardColors.id))
      .where(and(isNull(cards.deletedAt), isNull(lists.deletedAt), isNull(boards.deletedAt))),
  ]);
  const cardIds = cardRows.map((card) => card.id);
  const cardLabelRows = cardIds.length
    ? await db
        .select({ cardId: cardLabels.cardId, publicId: labels.publicId, name: labels.name, color: labels.color })
        .from(cardLabels)
        .innerJoin(labels, eq(cardLabels.labelId, labels.id))
        .where(inArray(cardLabels.cardId, cardIds))
    : [];

  return {
    boards: boardRows,
    sections: sectionRows,
    lists: listRows,
    colors: colorRows.map(({ publicId, name, color }) => ({ publicId, name, color })),
    labels: labelRows.map(({ publicId, name, color }) => ({ publicId, name, color })),
    cards: cardRows.map((card) => ({
      publicId: card.publicId,
      listPublicId: card.listPublicId,
      title: card.title,
      description: card.description,
      position: card.position,
      dueDate: card.dueDate ? iso(card.dueDate) : null,
      color: card.colorPublicId && card.colorName && card.colorValue ? { publicId: card.colorPublicId, name: card.colorName, color: card.colorValue } : null,
      labels: cardLabelRows.filter((label) => label.cardId === card.id).map(({ publicId, name, color }) => ({ publicId, name, color })),
      checklists: [],
      comments: [],
      activity: [],
      boardPublicId: card.boardPublicId,
      boardName: card.boardName,
      sectionPublicId: card.sectionPublicId,
      sectionName: card.sectionName,
      listName: card.listName,
    })),
  };
}

export async function getSettings(): Promise<AppSettings> {
  const rows = await db.select().from(settings);
  const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return {
    applicationName: values.applicationName || DEFAULT_SETTINGS.applicationName,
    logoLightUrl: values.logoLightUrl || "",
    logoDarkUrl: values.logoDarkUrl || "",
    defaultBoard: values.defaultBoard || "",
    language: values.language === "de" ? "de" : "en",
    dateFormat:
      values.dateFormat === "MM/dd/yyyy" || values.dateFormat === "yyyy-MM-dd"
        ? values.dateFormat
        : "dd.MM.yyyy",
    theme: values.theme === "light" || values.theme === "dark" ? values.theme : "system",
    compactCards: values.compactCards === "true",
  };
}

export async function findInitialBoard(): Promise<string | null> {
  const appSettings = await getSettings();
  if (appSettings.defaultBoard) {
    const [configured] = await db
      .select({ publicId: boards.publicId })
      .from(boards)
      .where(and(eq(boards.publicId, appSettings.defaultBoard), isNull(boards.deletedAt)))
      .limit(1);
    if (configured) return configured.publicId;
  }

  const [recent] = await db
    .select({ publicId: boards.publicId })
    .from(boards)
    .where(isNull(boards.deletedAt))
    .orderBy(desc(boards.lastOpenedAt), asc(boards.position))
    .limit(1);
  return recent?.publicId ?? null;
}

export async function getBoard(publicId: string, markOpened = false): Promise<BoardData | null> {
  const [board] = await db
    .select()
    .from(boards)
    .where(and(eq(boards.publicId, publicId), isNull(boards.deletedAt)))
    .limit(1);
  if (!board) return null;

  if (markOpened) {
    await db.update(boards).set({ lastOpenedAt: new Date() }).where(eq(boards.id, board.id));
  }

  const listRows = await db
    .select()
    .from(lists)
    .where(and(eq(lists.boardId, board.id), isNull(lists.deletedAt)))
    .orderBy(asc(lists.position));
  const listIds = listRows.map((row) => row.id);
  const cardRows = listIds.length
    ? await db
        .select()
        .from(cards)
        .where(and(inArray(cards.listId, listIds), isNull(cards.deletedAt)))
        .orderBy(asc(cards.position))
    : [];
  const cardIds = cardRows.map((row) => row.id);

  const [colorRows, labelRows, cardLabelRows, checklistRows, commentRows, activityRows] = await Promise.all([
    db.select().from(cardColors).orderBy(asc(cardColors.name)),
    db.select().from(labels).orderBy(asc(labels.name)),
    cardIds.length ? db.select().from(cardLabels).where(inArray(cardLabels.cardId, cardIds)) : [],
    cardIds.length
      ? db.select().from(checklists).where(inArray(checklists.cardId, cardIds)).orderBy(asc(checklists.position))
      : [],
    cardIds.length
      ? db.select().from(comments).where(inArray(comments.cardId, cardIds)).orderBy(desc(comments.createdAt))
      : [],
    cardIds.length
      ? db.select().from(cardActivity).where(inArray(cardActivity.cardId, cardIds)).orderBy(desc(cardActivity.createdAt))
      : [],
  ]);
  const checklistIds = checklistRows.map((row) => row.id);
  const itemRows = checklistIds.length
    ? await db
        .select()
        .from(checklistItems)
        .where(inArray(checklistItems.checklistId, checklistIds))
        .orderBy(asc(checklistItems.position))
    : [];

  const labelById = new Map(labelRows.map((row) => [row.id, row]));
  const colorById = new Map(colorRows.map((row) => [row.id, row]));
  const listPublicId = new Map(listRows.map((row) => [row.id, row.publicId]));
  return {
    publicId: board.publicId,
    name: board.name,
    updatedAt: iso(board.updatedAt),
    colors: colorRows.map(({ publicId: id, name, color }) => ({ publicId: id, name, color })),
    labels: labelRows.map(({ publicId: id, name, color }) => ({ publicId: id, name, color })),
    lists: listRows.map((list) => ({
      publicId: list.publicId,
      name: list.name,
      position: list.position,
      cards: cardRows
        .filter((card) => card.listId === list.id)
        .map((card) => ({
          publicId: card.publicId,
          listPublicId: listPublicId.get(card.listId) as string,
          title: card.title,
          description: card.description,
          position: card.position,
          dueDate: card.dueDate ? iso(card.dueDate) : null,
          color: card.colorId
            ? (() => {
                const cardColor = colorById.get(card.colorId);
                return cardColor ? { publicId: cardColor.publicId, name: cardColor.name, color: cardColor.color } : null;
              })()
            : null,
          labels: cardLabelRows
            .filter((link) => link.cardId === card.id)
            .map((link) => labelById.get(link.labelId))
            .filter((label): label is NonNullable<typeof label> => Boolean(label))
            .map(({ publicId: id, name, color }) => ({ publicId: id, name, color })),
          checklists: checklistRows
            .filter((checklist) => checklist.cardId === card.id)
            .map((checklist) => ({
              publicId: checklist.publicId,
              title: checklist.title,
              position: checklist.position,
              items: itemRows
                .filter((item) => item.checklistId === checklist.id)
                .map((item) => ({
                  publicId: item.publicId,
                  text: item.text,
                  completed: item.completed,
                  position: item.position,
                })),
            })),
          comments: commentRows
            .filter((comment) => comment.cardId === card.id)
            .map((comment) => ({
              publicId: comment.publicId,
              text: comment.text,
              createdAt: iso(comment.createdAt),
            })),
          activity: activityRows
            .filter((activity) => activity.cardId === card.id)
            .map((activity) => ({
              publicId: activity.publicId,
              type: activity.type,
              metadata: activity.metadata,
              createdAt: iso(activity.createdAt),
            })),
        })),
    })),
  };
}

async function boardPublicIdForList(listPublicId: string): Promise<string> {
  const [row] = await db
    .select({ publicId: boards.publicId })
    .from(lists)
    .innerJoin(boards, eq(lists.boardId, boards.id))
    .where(and(eq(lists.publicId, listPublicId), isNull(lists.deletedAt), isNull(boards.deletedAt)))
    .limit(1);
  if (!row) throw new Error("List not found");
  return row.publicId;
}

async function boardPublicIdForCard(cardPublicId: string): Promise<string> {
  const [row] = await db
    .select({ publicId: boards.publicId })
    .from(cards)
    .innerJoin(lists, eq(cards.listId, lists.id))
    .innerJoin(boards, eq(lists.boardId, boards.id))
    .where(and(eq(cards.publicId, cardPublicId), isNull(cards.deletedAt), isNull(lists.deletedAt), isNull(boards.deletedAt)))
    .limit(1);
  if (!row) throw new Error("Card not found");
  return row.publicId;
}

async function addActivity(cardId: number, type: string, metadata: Record<string, string> = {}) {
  await db.insert(cardActivity).values({
    publicId: createPublicId("act"),
    cardId,
    type,
    metadata,
  });
}

export async function createBoard(name: string, templatePublicId?: string, sectionPublicId?: string): Promise<string> {
  const [last] = await db
    .select({ position: boards.position })
    .from(boards)
    .where(isNull(boards.deletedAt))
    .orderBy(desc(boards.position))
    .limit(1);
  const publicId = createPublicId("brd");

  await db.transaction(async (tx) => {
    const [section] = sectionPublicId
      ? await tx.select({ id: boardSections.id }).from(boardSections).where(eq(boardSections.publicId, sectionPublicId)).limit(1)
      : [];
    if (sectionPublicId && !section) throw new Error("Section not found");
    const [board] = await tx
      .insert(boards)
      .values({ publicId, name, sectionId: section?.id ?? null, position: rankAfter(last?.position), lastOpenedAt: new Date() })
      .returning({ id: boards.id });
    if (templatePublicId === "default") {
      await tx.insert(lists).values(["IN PROGRESS", "TODO", "BACKLOG", "DONE"].map((listName, index) => ({
        publicId: createPublicId("lst"),
        boardId: board.id,
        name: listName,
        position: (index + 1) * RANK_STEP,
      })));
      return;
    }
    if (!templatePublicId) return;
    const [template] = await tx.select().from(templates).where(eq(templates.publicId, templatePublicId)).limit(1);
    if (!template) throw new Error("Template not found");
    for (const listData of template.data.lists) {
      const [list] = await tx
        .insert(lists)
        .values({
          publicId: createPublicId("lst"),
          boardId: board.id,
          name: listData.name,
          position: listData.position,
        })
        .returning({ id: lists.id });
      if (listData.cards.length) {
        await tx.insert(cards).values(
          listData.cards.map((card) => ({
            publicId: createPublicId("crd"),
            listId: list.id,
            title: card.title,
            description: card.description,
            position: card.position,
          })),
        );
      }
    }
  });
  return publicId;
}

export async function createBoardSection(name: string, icon: string): Promise<void> {
  const [last] = await db.select({ position: boardSections.position }).from(boardSections).orderBy(desc(boardSections.position)).limit(1);
  await db.insert(boardSections).values({ publicId: createPublicId("sec"), name, icon, position: rankAfter(last?.position) });
}

export async function renameBoardSection(publicId: string, name: string, icon: string): Promise<void> {
  await db.update(boardSections).set({ name, icon, updatedAt: new Date() }).where(eq(boardSections.publicId, publicId));
}

export async function moveBoardSection(publicId: string, before?: number | null, after?: number | null): Promise<void> {
  await db
    .update(boardSections)
    .set({ position: rankBetween(before, after), updatedAt: new Date() })
    .where(eq(boardSections.publicId, publicId));
}

export async function deleteBoardSection(publicId: string): Promise<void> {
  await db.delete(boardSections).where(eq(boardSections.publicId, publicId));
}

export async function assignBoardSection(boardPublicId: string, sectionPublicId?: string): Promise<void> {
  const [section] = sectionPublicId
    ? await db.select({ id: boardSections.id }).from(boardSections).where(eq(boardSections.publicId, sectionPublicId)).limit(1)
    : [];
  if (sectionPublicId && !section) throw new Error("Section not found");
  await db.update(boards).set({ sectionId: section?.id ?? null, updatedAt: new Date() }).where(and(eq(boards.publicId, boardPublicId), isNull(boards.deletedAt)));
}

export async function renameBoard(publicId: string, name: string): Promise<void> {
  await db.update(boards).set({ name, updatedAt: new Date() }).where(and(eq(boards.publicId, publicId), isNull(boards.deletedAt)));
}

export async function deleteBoard(publicId: string): Promise<void> {
  await db.update(boards).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(boards.publicId, publicId));
}

export async function duplicateBoard(publicId: string): Promise<string> {
  const source = await getBoard(publicId);
  if (!source) throw new Error("Board not found");
  const [sourceSection] = await db
    .select({ publicId: boardSections.publicId })
    .from(boards)
    .leftJoin(boardSections, eq(boards.sectionId, boardSections.id))
    .where(eq(boards.publicId, publicId))
    .limit(1);
  const templatePublicId = await saveBoardAsTemplate(publicId, `${source.name} copy`, "Temporary duplicate source");
  const nextId = await createBoard(`${source.name} copy`, templatePublicId, sourceSection?.publicId ?? undefined);
  await db.delete(templates).where(eq(templates.publicId, templatePublicId));
  return nextId;
}

export async function createList(boardPublicId: string, name: string): Promise<BoardData> {
  const [board] = await db.select({ id: boards.id }).from(boards).where(and(eq(boards.publicId, boardPublicId), isNull(boards.deletedAt))).limit(1);
  if (!board) throw new Error("Board not found");
  const [last] = await db.select({ position: lists.position }).from(lists).where(and(eq(lists.boardId, board.id), isNull(lists.deletedAt))).orderBy(desc(lists.position)).limit(1);
  await db.insert(lists).values({ publicId: createPublicId("lst"), boardId: board.id, name, position: rankAfter(last?.position) });
  return (await getBoard(boardPublicId)) as BoardData;
}

export async function renameList(publicId: string, name: string): Promise<BoardData> {
  const boardPublicId = await boardPublicIdForList(publicId);
  await db.update(lists).set({ name, updatedAt: new Date() }).where(and(eq(lists.publicId, publicId), isNull(lists.deletedAt)));
  return (await getBoard(boardPublicId)) as BoardData;
}

export async function moveList(publicId: string, before?: number | null, after?: number | null): Promise<BoardData> {
  const boardPublicId = await boardPublicIdForList(publicId);
  await db.update(lists).set({ position: rankBetween(before, after), updatedAt: new Date() }).where(eq(lists.publicId, publicId));
  return (await getBoard(boardPublicId)) as BoardData;
}

export async function deleteList(publicId: string): Promise<BoardData> {
  const boardPublicId = await boardPublicIdForList(publicId);
  await db.update(lists).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(lists.publicId, publicId));
  return (await getBoard(boardPublicId)) as BoardData;
}

export async function createCard(listPublicId: string, title: string): Promise<BoardData> {
  const boardPublicId = await boardPublicIdForList(listPublicId);
  const [list] = await db.select({ id: lists.id }).from(lists).where(eq(lists.publicId, listPublicId)).limit(1);
  const [last] = await db.select({ position: cards.position }).from(cards).where(and(eq(cards.listId, list.id), isNull(cards.deletedAt))).orderBy(desc(cards.position)).limit(1);
  const [card] = await db.insert(cards).values({ publicId: createPublicId("crd"), listId: list.id, title, position: rankAfter(last?.position) }).returning({ id: cards.id });
  await addActivity(card.id, "Card created");
  return (await getBoard(boardPublicId)) as BoardData;
}

export async function updateCard(publicId: string, title: string, description: string, dueDate: Date | null): Promise<BoardData> {
  const boardPublicId = await boardPublicIdForCard(publicId);
  const [card] = await db.update(cards).set({ title, description, dueDate, updatedAt: new Date() }).where(and(eq(cards.publicId, publicId), isNull(cards.deletedAt))).returning({ id: cards.id });
  await addActivity(card.id, "Card updated");
  return (await getBoard(boardPublicId)) as BoardData;
}

export async function setCardColor(publicId: string, colorPublicId?: string): Promise<BoardData> {
  const boardPublicId = await boardPublicIdForCard(publicId);
  const [color] = colorPublicId
    ? await db
        .select({ id: cardColors.id, name: cardColors.name })
        .from(cardColors)
        .where(eq(cardColors.publicId, colorPublicId))
        .limit(1)
    : [];
  if (colorPublicId && !color) throw new Error("Card color not found");
  const [card] = await db
    .update(cards)
    .set({ colorId: color?.id ?? null, updatedAt: new Date() })
    .where(and(eq(cards.publicId, publicId), isNull(cards.deletedAt)))
    .returning({ id: cards.id });
  await addActivity(card.id, "Card color changed", { color: color?.name ?? "None" });
  return (await getBoard(boardPublicId)) as BoardData;
}

export async function createCardColor(boardPublicId: string, name: string, color: string): Promise<BoardData> {
  const [board] = await db.select({ id: boards.id }).from(boards).where(eq(boards.publicId, boardPublicId)).limit(1);
  if (!board) throw new Error("Board not found");
  await db.insert(cardColors).values({ publicId: createPublicId("clr"), boardId: null, sectionId: null, name, color });
  return (await getBoard(boardPublicId)) as BoardData;
}

export async function updateCardColor(publicId: string, boardPublicId: string, name: string, color: string): Promise<BoardData> {
  await db.update(cardColors).set({ name, color, updatedAt: new Date() }).where(eq(cardColors.publicId, publicId));
  return (await getBoard(boardPublicId)) as BoardData;
}

export async function deleteCardColor(publicId: string, boardPublicId: string): Promise<BoardData> {
  await db.delete(cardColors).where(eq(cardColors.publicId, publicId));
  return (await getBoard(boardPublicId)) as BoardData;
}

export async function moveCard(publicId: string, targetListPublicId: string, before?: number | null, after?: number | null): Promise<BoardData> {
  const boardPublicId = await boardPublicIdForCard(publicId);
  const [source] = await db.select({ id: cards.id, listId: cards.listId }).from(cards).where(eq(cards.publicId, publicId)).limit(1);
  const [target] = await db.select({ id: lists.id, name: lists.name }).from(lists).where(and(eq(lists.publicId, targetListPublicId), isNull(lists.deletedAt))).limit(1);
  if (!target) throw new Error("Target list not found");
  const [sourceList] = await db.select({ name: lists.name }).from(lists).where(eq(lists.id, source.listId)).limit(1);
  await db.update(cards).set({ listId: target.id, position: rankBetween(before, after), updatedAt: new Date() }).where(eq(cards.id, source.id));
  if (source.listId !== target.id) await addActivity(source.id, "Card moved", { from: sourceList.name, to: target.name });
  return (await getBoard(boardPublicId)) as BoardData;
}

export async function deleteCard(publicId: string): Promise<BoardData> {
  const boardPublicId = await boardPublicIdForCard(publicId);
  await db.update(cards).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(cards.publicId, publicId));
  return (await getBoard(boardPublicId)) as BoardData;
}

export async function createLabel(boardPublicId: string, name: string, color: string): Promise<BoardData> {
  const [board] = await db.select({ id: boards.id }).from(boards).where(eq(boards.publicId, boardPublicId)).limit(1);
  if (!board) throw new Error("Board not found");
  await db.insert(labels).values({ publicId: createPublicId("lbl"), boardId: null, sectionId: null, name, color });
  return (await getBoard(boardPublicId)) as BoardData;
}

export async function updateLabel(publicId: string, boardPublicId: string, name: string, color: string): Promise<BoardData> {
  await db.update(labels).set({ name, color, updatedAt: new Date() }).where(eq(labels.publicId, publicId));
  return (await getBoard(boardPublicId)) as BoardData;
}

export async function deleteLabel(publicId: string, boardPublicId: string): Promise<BoardData> {
  await db.delete(labels).where(eq(labels.publicId, publicId));
  return (await getBoard(boardPublicId)) as BoardData;
}

export async function toggleCardLabel(cardPublicId: string, labelPublicId: string): Promise<BoardData> {
  const boardPublicId = await boardPublicIdForCard(cardPublicId);
  const [card] = await db.select({ id: cards.id }).from(cards).where(eq(cards.publicId, cardPublicId)).limit(1);
  const [label] = await db.select({ id: labels.id }).from(labels).where(eq(labels.publicId, labelPublicId)).limit(1);
  if (!card || !label) throw new Error("Card or label not found");
  const [existing] = await db.select().from(cardLabels).where(and(eq(cardLabels.cardId, card.id), eq(cardLabels.labelId, label.id))).limit(1);
  if (existing) {
    await db.delete(cardLabels).where(and(eq(cardLabels.cardId, card.id), eq(cardLabels.labelId, label.id)));
    await addActivity(card.id, "Label removed");
  } else {
    await db.insert(cardLabels).values({ cardId: card.id, labelId: label.id });
    await addActivity(card.id, "Label added");
  }
  return (await getBoard(boardPublicId)) as BoardData;
}

export async function createChecklist(cardPublicId: string, title: string): Promise<BoardData> {
  const boardPublicId = await boardPublicIdForCard(cardPublicId);
  const [card] = await db.select({ id: cards.id }).from(cards).where(eq(cards.publicId, cardPublicId)).limit(1);
  const [last] = await db.select({ position: checklists.position }).from(checklists).where(eq(checklists.cardId, card.id)).orderBy(desc(checklists.position)).limit(1);
  await db.insert(checklists).values({ publicId: createPublicId("chk"), cardId: card.id, title, position: rankAfter(last?.position) });
  await addActivity(card.id, "Checklist added");
  return (await getBoard(boardPublicId)) as BoardData;
}

export async function deleteChecklist(publicId: string): Promise<BoardData> {
  const [row] = await db.select({ cardId: checklists.cardId, cardPublicId: cards.publicId }).from(checklists).innerJoin(cards, eq(checklists.cardId, cards.id)).where(eq(checklists.publicId, publicId)).limit(1);
  if (!row) throw new Error("Checklist not found");
  const boardPublicId = await boardPublicIdForCard(row.cardPublicId);
  await db.delete(checklists).where(eq(checklists.publicId, publicId));
  await addActivity(row.cardId, "Checklist removed");
  return (await getBoard(boardPublicId)) as BoardData;
}

export async function createChecklistItem(checklistPublicId: string, text: string): Promise<BoardData> {
  const [checklist] = await db.select({ id: checklists.id, cardPublicId: cards.publicId }).from(checklists).innerJoin(cards, eq(checklists.cardId, cards.id)).where(eq(checklists.publicId, checklistPublicId)).limit(1);
  if (!checklist) throw new Error("Checklist not found");
  const [last] = await db.select({ position: checklistItems.position }).from(checklistItems).where(eq(checklistItems.checklistId, checklist.id)).orderBy(desc(checklistItems.position)).limit(1);
  await db.insert(checklistItems).values({ publicId: createPublicId("itm"), checklistId: checklist.id, text, position: rankAfter(last?.position) });
  return (await getBoard(await boardPublicIdForCard(checklist.cardPublicId))) as BoardData;
}

export async function updateChecklistItem(publicId: string, text: string, completed: boolean, before?: number | null, after?: number | null): Promise<BoardData> {
  const [row] = await db.select({ cardPublicId: cards.publicId }).from(checklistItems).innerJoin(checklists, eq(checklistItems.checklistId, checklists.id)).innerJoin(cards, eq(checklists.cardId, cards.id)).where(eq(checklistItems.publicId, publicId)).limit(1);
  if (!row) throw new Error("Checklist item not found");
  const update: { text: string; completed: boolean; position?: number; updatedAt: Date } = { text, completed, updatedAt: new Date() };
  if (before !== undefined || after !== undefined) update.position = rankBetween(before, after);
  await db.update(checklistItems).set(update).where(eq(checklistItems.publicId, publicId));
  return (await getBoard(await boardPublicIdForCard(row.cardPublicId))) as BoardData;
}

export async function deleteChecklistItem(publicId: string): Promise<BoardData> {
  const [row] = await db.select({ cardPublicId: cards.publicId }).from(checklistItems).innerJoin(checklists, eq(checklistItems.checklistId, checklists.id)).innerJoin(cards, eq(checklists.cardId, cards.id)).where(eq(checklistItems.publicId, publicId)).limit(1);
  if (!row) throw new Error("Checklist item not found");
  await db.delete(checklistItems).where(eq(checklistItems.publicId, publicId));
  return (await getBoard(await boardPublicIdForCard(row.cardPublicId))) as BoardData;
}

export async function addComment(cardPublicId: string, text: string): Promise<BoardData> {
  const boardPublicId = await boardPublicIdForCard(cardPublicId);
  const [card] = await db.select({ id: cards.id }).from(cards).where(eq(cards.publicId, cardPublicId)).limit(1);
  await db.insert(comments).values({ publicId: createPublicId("cmt"), cardId: card.id, text });
  await addActivity(card.id, "Comment added");
  return (await getBoard(boardPublicId)) as BoardData;
}

export async function deleteComment(publicId: string): Promise<BoardData> {
  const [row] = await db.select({ cardPublicId: cards.publicId }).from(comments).innerJoin(cards, eq(comments.cardId, cards.id)).where(eq(comments.publicId, publicId)).limit(1);
  if (!row) throw new Error("Comment not found");
  await db.delete(comments).where(eq(comments.publicId, publicId));
  return (await getBoard(await boardPublicIdForCard(row.cardPublicId))) as BoardData;
}

export async function saveBoardAsTemplate(boardPublicId: string, name: string, description: string): Promise<string> {
  const board = await getBoard(boardPublicId);
  if (!board) throw new Error("Board not found");
  const data: TemplateData = {
    lists: board.lists.map((list) => ({
      name: list.name,
      position: list.position,
      cards: list.cards.map((card) => ({
        title: card.title,
        description: card.description,
        position: card.position,
      })),
    })),
  };
  const publicId = createPublicId("tpl");
  await db.insert(templates).values({ publicId, name, description, data });
  return publicId;
}

export async function listTemplates(): Promise<TemplateSummary[]> {
  const rows = await db.select().from(templates).orderBy(desc(templates.updatedAt));
  return rows.map((row) => ({
    publicId: row.publicId,
    name: row.name,
    description: row.description,
    listCount: row.data.lists.length,
    cardCount: row.data.lists.reduce((sum, list) => sum + list.cards.length, 0),
  }));
}

export async function deleteTemplate(publicId: string): Promise<void> {
  await db.delete(templates).where(eq(templates.publicId, publicId));
}

export async function saveSettings(values: AppSettings): Promise<void> {
  await db.transaction(async (tx) => {
    for (const [key, value] of Object.entries(values)) {
      await tx
        .insert(settings)
        .values({ key, value: String(value), updatedAt: new Date() })
        .onConflictDoUpdate({ target: settings.key, set: { value: String(value), updatedAt: new Date() } });
    }
  });
}

export async function exportData() {
  const tableData = await Promise.all([
    db.select().from(boardSections),
    db.select().from(boards),
    db.select().from(lists),
    db.select().from(cards),
    db.select().from(cardColors),
    db.select().from(labels),
    db.select().from(cardLabels),
    db.select().from(checklists),
    db.select().from(checklistItems),
    db.select().from(comments),
    db.select().from(cardActivity),
    db.select().from(templates),
    db.select().from(settings),
  ]);
  const [sectionRows, boardRows, listRows, cardRows, colorRows, labelRows, linkRows, checklistRows, itemRows, commentRows, activityRows, templateRows, settingRows] = tableData;
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: { boardSections: sectionRows, boards: boardRows, lists: listRows, cards: cardRows, cardColors: colorRows, labels: labelRows, cardLabels: linkRows, checklists: checklistRows, checklistItems: itemRows, comments: commentRows, cardActivity: activityRows, templates: templateRows, settings: settingRows },
  };
}

export async function databaseHealth(): Promise<boolean> {
  const result = await db.execute(drizzleSql`select 1 as healthy`);
  return result.length === 1;
}

export function currentTimestamp(): number {
  return Date.now();
}

export async function importBackup(backup: Backup): Promise<void> {
  const data = backup.data;
  const toDate = (value: string) => new Date(value);
  const optionalDate = (value: string | null) => (value ? new Date(value) : null);
  await db.transaction(async (tx) => {
    await tx.delete(settings);
    await tx.delete(templates);
    await tx.delete(boards);
    await tx.delete(boardSections);

    if (data.boardSections.length) await tx.insert(boardSections).values(data.boardSections.map((row) => ({ ...row, createdAt: toDate(row.createdAt), updatedAt: toDate(row.updatedAt) })));
    if (data.boards.length) await tx.insert(boards).values(data.boards.map((row) => ({ ...row, createdAt: toDate(row.createdAt), updatedAt: toDate(row.updatedAt), lastOpenedAt: optionalDate(row.lastOpenedAt), deletedAt: optionalDate(row.deletedAt) })));
    if (data.lists.length) await tx.insert(lists).values(data.lists.map((row) => ({ ...row, createdAt: toDate(row.createdAt), updatedAt: toDate(row.updatedAt), deletedAt: optionalDate(row.deletedAt) })));
    if (data.labels.length) await tx.insert(labels).values(data.labels.map((row) => ({ ...row, createdAt: toDate(row.createdAt), updatedAt: toDate(row.updatedAt) })));
    const legacyColorIds = new Set(data.cards.map((row) => row.colorLabelId).filter((id): id is number => typeof id === "number"));
    const importedColors = data.cardColors.length ? data.cardColors : data.labels.filter((row) => legacyColorIds.has(row.id)).map((row) => ({ ...row, publicId: row.publicId.replace(/^lbl_/, "clr_") }));
    if (importedColors.length) await tx.insert(cardColors).values(importedColors.map((row) => ({ ...row, createdAt: toDate(row.createdAt), updatedAt: toDate(row.updatedAt) })));
    if (data.cards.length) await tx.insert(cards).values(data.cards.map((row) => { const { colorLabelId, ...card } = row; return { ...card, colorId: card.colorId ?? colorLabelId ?? null, createdAt: toDate(row.createdAt), updatedAt: toDate(row.updatedAt), dueDate: optionalDate(row.dueDate), deletedAt: optionalDate(row.deletedAt) }; }));
    if (data.cardLabels.length) await tx.insert(cardLabels).values(data.cardLabels);
    if (data.checklists.length) await tx.insert(checklists).values(data.checklists.map((row) => ({ ...row, createdAt: toDate(row.createdAt), updatedAt: toDate(row.updatedAt) })));
    if (data.checklistItems.length) await tx.insert(checklistItems).values(data.checklistItems.map((row) => ({ ...row, createdAt: toDate(row.createdAt), updatedAt: toDate(row.updatedAt) })));
    if (data.comments.length) await tx.insert(comments).values(data.comments.map((row) => ({ ...row, createdAt: toDate(row.createdAt), updatedAt: toDate(row.updatedAt) })));
    if (data.cardActivity.length) await tx.insert(cardActivity).values(data.cardActivity.map((row) => ({ ...row, createdAt: toDate(row.createdAt) })));
    if (data.templates.length) await tx.insert(templates).values(data.templates.map((row) => ({ ...row, createdAt: toDate(row.createdAt), updatedAt: toDate(row.updatedAt) })));
    if (data.settings.length) await tx.insert(settings).values(data.settings.map((row) => ({ ...row, updatedAt: toDate(row.updatedAt) })));

    for (const table of ["board_sections", "boards", "lists", "cards", "card_colors", "labels", "checklists", "checklist_items", "comments", "card_activity", "templates"]) {
      await tx.execute(drizzleSql.raw(`select setval(pg_get_serial_sequence('${table}', 'id'), coalesce(max(id), 1), max(id) is not null) from ${table}`));
    }
  });
}

export { DEFAULT_SETTINGS, RANK_STEP };
