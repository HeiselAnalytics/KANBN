import { beforeEach, describe, expect, it } from "vitest";

import { sql } from "@/lib/db";
import {
  addComment,
  assignBoardSection,
  createBoard,
  createBoardSection,
  createCard,
  createCardColor,
  createChecklist,
  createChecklistItem,
  createLabel,
  createList,
  deleteBoard,
  deleteCard,
  deleteList,
  findInitialBoard,
  getBoard,
  listBoards,
  listBoardSections,
  listTemplates,
  moveCard,
  moveBoardSection,
  moveList,
  renameBoard,
  saveBoardAsTemplate,
  setCardColor,
  toggleCardLabel,
  updateCard,
  updateChecklistItem,
} from "@/lib/services/kanban";

const database = process.env.RUN_DB_TESTS === "1" ? describe : describe.skip;

database("KANBN persistence", () => {
  beforeEach(async () => {
    await sql`truncate table settings, templates, board_sections, boards restart identity cascade`;
  });

  it("creates freely named sections, assigns boards and builds the default board", async () => {
    await createBoardSection("Marketing", "Megaphone");
    await createBoardSection("Admin", "Settings");
    let sections = await listBoardSections();
    const section = sections[0];
    expect(section.icon).toBe("Megaphone");
    await moveBoardSection(sections[1].publicId, null, section.position);
    sections = await listBoardSections();
    expect(sections.map((entry) => entry.name)).toEqual(["Admin", "Marketing"]);
    const boardId = await createBoard("Campaigns", "default", section.publicId);
    const secondBoardId = await createBoard("Website", "default", section.publicId);
    const unsectionedBoardId = await createBoard("Operations", "default");
    await createLabel(boardId, "Marketing", "#FFAA00");
    await createCardColor(boardId, "Campaign", "#DF3F3F");
    expect((await listBoards())[0]).toMatchObject({ publicId: boardId, sectionPublicId: section.publicId });
    expect((await getBoard(boardId))?.lists.map((list) => list.name)).toEqual(["IN PROGRESS", "TODO", "BACKLOG", "DONE"]);
    expect((await getBoard(secondBoardId))?.labels.map((label) => label.name)).toContain("Marketing");
    expect((await getBoard(secondBoardId))?.colors.map((color) => color.name)).toContain("Campaign");
    expect((await getBoard(unsectionedBoardId))?.labels.map((label) => label.name)).toContain("Marketing");
    expect((await getBoard(unsectionedBoardId))?.colors.map((color) => color.name)).toContain("Campaign");
    await assignBoardSection(boardId);
    expect((await listBoards())[0].sectionPublicId).toBeNull();
  });

  it("creates, renames and soft-deletes boards", async () => {
    const id = await createBoard("Development");
    await renameBoard(id, "Product");
    expect((await getBoard(id))?.name).toBe("Product");
    expect(await findInitialBoard()).toBe(id);
    await deleteBoard(id);
    expect(await getBoard(id)).toBeNull();
    expect(await listBoards()).toEqual([]);
  });

  it("persists list and card ordering within and between lists", async () => {
    const boardId = await createBoard("Development");
    let board = await createList(boardId, "TODO");
    board = await createList(boardId, "DOING");
    board = await createList(boardId, "DONE");
    const [todo, doing, done] = board.lists;

    board = await moveList(done.publicId, null, todo.position);
    expect(board.lists.map((list) => list.name)).toEqual(["DONE", "TODO", "DOING"]);

    board = await createCard(todo.publicId, "First");
    board = await createCard(todo.publicId, "Second");
    const first = board.lists.find((list) => list.publicId === todo.publicId)!.cards[0];
    const second = board.lists.find((list) => list.publicId === todo.publicId)!.cards[1];
    board = await moveCard(second.publicId, todo.publicId, null, first.position);
    expect(board.lists.find((list) => list.publicId === todo.publicId)!.cards.map((card) => card.title)).toEqual(["Second", "First"]);
    board = await moveCard(first.publicId, doing.publicId, null, null);
    expect(board.lists.find((list) => list.publicId === doing.publicId)!.cards[0].title).toBe("First");

    const reloaded = await getBoard(boardId);
    expect(reloaded?.lists.find((list) => list.publicId === doing.publicId)?.cards[0].title).toBe("First");
  });

  it("edits cards and persists labels, checklists, comments and soft deletion", async () => {
    const boardId = await createBoard("Development");
    let board = await createList(boardId, "TODO");
    board = await createCard(board.lists[0].publicId, "Ship release");
    const cardId = board.lists[0].cards[0].publicId;
    board = await updateCard(cardId, "Ship v1", "Release checklist", new Date("2030-08-28T12:00:00Z"));
    board = await createLabel(boardId, "Release", "#FFAA00");
    board = await toggleCardLabel(cardId, board.labels[0].publicId);
    board = await createCardColor(boardId, "Priority", "#DF3F3F");
    board = await setCardColor(cardId, board.colors[0].publicId);
    board = await createChecklist(cardId, "Before shipping");
    board = await createChecklistItem(board.lists[0].cards[0].checklists[0].publicId, "Run tests");
    const item = board.lists[0].cards[0].checklists[0].items[0];
    board = await updateChecklistItem(item.publicId, item.text, true);
    board = await addComment(cardId, "Ready to ship.");
    expect(board.lists[0].cards[0]).toMatchObject({ title: "Ship v1", description: "Release checklist" });
    expect(board.lists[0].cards[0].labels[0].name).toBe("Release");
    expect(board.lists[0].cards[0].color).toMatchObject({ name: "Priority", color: "#DF3F3F" });
    expect(board.lists[0].cards[0].checklists[0].items[0].completed).toBe(true);
    expect(board.lists[0].cards[0].comments[0].text).toBe("Ready to ship.");
    await deleteCard(cardId);
    expect((await getBoard(boardId))?.lists[0].cards).toEqual([]);
    await deleteList(board.lists[0].publicId);
    expect((await getBoard(boardId))?.lists).toEqual([]);
  });

  it("saves a board as a template and creates a new board from it", async () => {
    const sourceId = await createBoard("Source");
    const board = await createList(sourceId, "TODO");
    await createCard(board.lists[0].publicId, "Template card");
    const templateId = await saveBoardAsTemplate(sourceId, "Starter", "Reusable flow");
    expect((await listTemplates())[0]).toMatchObject({ publicId: templateId, listCount: 1, cardCount: 1 });
    const targetId = await createBoard("From template", templateId);
    expect((await getBoard(targetId))?.lists[0].cards[0].title).toBe("Template card");
  });
});
