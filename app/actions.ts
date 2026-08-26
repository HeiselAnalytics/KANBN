"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

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
  deleteBoardSection,
  deleteCard,
  deleteCardColor,
  deleteChecklist,
  deleteChecklistItem,
  deleteComment,
  deleteLabel,
  deleteList,
  deleteTemplate,
  duplicateBoard,
  moveCard,
  moveBoardSection,
  moveList,
  renameBoard,
  renameBoardSection,
  renameList,
  saveBoardAsTemplate,
  saveSettings,
  setCardColor,
  toggleCardLabel,
  updateCard,
  updateCardColor,
  updateChecklistItem,
  updateLabel,
} from "@/lib/services/kanban";
import type { AppSettings, BoardData } from "@/lib/types";
import {
  cardUpdateSchema,
  colorSchema,
  createBoardSchema,
  moveSchema,
  nameSchema,
  publicIdSchema,
  sectionIconSchema,
  settingsSchema,
  titleSchema,
} from "@/lib/validation/schemas";

const textSchema = z.string().trim().min(1).max(10_000);

function refreshBoard(publicId?: string) {
  revalidatePath("/");
  revalidatePath("/overview");
  revalidatePath("/settings");
  revalidatePath("/templates");
  if (publicId) revalidatePath(`/b/${publicId}`);
}

export async function createBoardAction(input: { name: string; templatePublicId?: string; sectionPublicId?: string }): Promise<string> {
  const values = createBoardSchema.parse(input);
  const publicId = await createBoard(values.name, values.templatePublicId || undefined, values.sectionPublicId || undefined);
  refreshBoard(publicId);
  return publicId;
}

export async function createBoardSectionAction(name: string, icon: string): Promise<void> {
  await createBoardSection(nameSchema.parse(name), sectionIconSchema.parse(icon));
  refreshBoard();
}

export async function renameBoardSectionAction(publicId: string, name: string, icon: string): Promise<void> {
  await renameBoardSection(publicIdSchema.parse(publicId), nameSchema.parse(name), sectionIconSchema.parse(icon));
  refreshBoard();
}

export async function moveBoardSectionAction(input: { publicId: string; beforePosition?: number | null; afterPosition?: number | null }): Promise<void> {
  const values = moveSchema.parse(input);
  await moveBoardSection(values.publicId, values.beforePosition, values.afterPosition);
  refreshBoard();
}

export async function deleteBoardSectionAction(publicId: string): Promise<void> {
  await deleteBoardSection(publicIdSchema.parse(publicId));
  refreshBoard();
}

export async function assignBoardSectionAction(boardPublicId: string, sectionPublicId?: string): Promise<void> {
  await assignBoardSection(publicIdSchema.parse(boardPublicId), sectionPublicId ? publicIdSchema.parse(sectionPublicId) : undefined);
  refreshBoard(boardPublicId);
}

export async function renameBoardAction(publicId: string, name: string): Promise<void> {
  await renameBoard(publicIdSchema.parse(publicId), nameSchema.parse(name));
  refreshBoard(publicId);
}

export async function duplicateBoardAction(publicId: string): Promise<string> {
  const nextId = await duplicateBoard(publicIdSchema.parse(publicId));
  refreshBoard(nextId);
  return nextId;
}

export async function deleteBoardAction(publicId: string): Promise<void> {
  await deleteBoard(publicIdSchema.parse(publicId));
  refreshBoard();
}

export async function createListAction(boardPublicId: string, name: string): Promise<BoardData> {
  const data = await createList(publicIdSchema.parse(boardPublicId), nameSchema.parse(name));
  refreshBoard(boardPublicId);
  return data;
}

export async function renameListAction(publicId: string, name: string): Promise<BoardData> {
  const data = await renameList(publicIdSchema.parse(publicId), nameSchema.parse(name));
  refreshBoard(data.publicId);
  return data;
}

export async function moveListAction(input: { publicId: string; beforePosition?: number | null; afterPosition?: number | null }): Promise<BoardData> {
  const values = moveSchema.parse(input);
  const data = await moveList(values.publicId, values.beforePosition, values.afterPosition);
  refreshBoard(data.publicId);
  return data;
}

export async function deleteListAction(publicId: string): Promise<BoardData> {
  const data = await deleteList(publicIdSchema.parse(publicId));
  refreshBoard(data.publicId);
  return data;
}

export async function createCardAction(listPublicId: string, title: string): Promise<BoardData> {
  const data = await createCard(publicIdSchema.parse(listPublicId), titleSchema.parse(title));
  refreshBoard(data.publicId);
  return data;
}

export async function updateCardAction(input: { publicId: string; title: string; description: string; dueDate: string | null }): Promise<BoardData> {
  const values = cardUpdateSchema.parse(input);
  const data = await updateCard(values.publicId, values.title, values.description, values.dueDate ? new Date(values.dueDate) : null);
  refreshBoard(data.publicId);
  return data;
}

export async function setCardColorAction(cardPublicId: string, colorPublicId?: string): Promise<BoardData> {
  const data = await setCardColor(publicIdSchema.parse(cardPublicId), colorPublicId ? publicIdSchema.parse(colorPublicId) : undefined);
  refreshBoard(data.publicId);
  return data;
}

export async function createCardColorAction(boardPublicId: string, name: string, color: string): Promise<BoardData> {
  const data = await createCardColor(publicIdSchema.parse(boardPublicId), nameSchema.parse(name), colorSchema.parse(color));
  refreshBoard(data.publicId);
  return data;
}

export async function updateCardColorAction(publicId: string, boardPublicId: string, name: string, color: string): Promise<BoardData> {
  const data = await updateCardColor(publicIdSchema.parse(publicId), publicIdSchema.parse(boardPublicId), nameSchema.parse(name), colorSchema.parse(color));
  refreshBoard(data.publicId);
  return data;
}

export async function deleteCardColorAction(publicId: string, boardPublicId: string): Promise<BoardData> {
  const data = await deleteCardColor(publicIdSchema.parse(publicId), publicIdSchema.parse(boardPublicId));
  refreshBoard(data.publicId);
  return data;
}

export async function moveCardAction(input: { publicId: string; targetListPublicId: string; beforePosition?: number | null; afterPosition?: number | null }): Promise<BoardData> {
  const values = moveSchema.extend({ targetListPublicId: publicIdSchema }).parse(input);
  const data = await moveCard(values.publicId, values.targetListPublicId, values.beforePosition, values.afterPosition);
  refreshBoard(data.publicId);
  return data;
}

export async function deleteCardAction(publicId: string): Promise<BoardData> {
  const data = await deleteCard(publicIdSchema.parse(publicId));
  refreshBoard(data.publicId);
  return data;
}

export async function createLabelAction(boardPublicId: string, name: string, color: string): Promise<BoardData> {
  const data = await createLabel(publicIdSchema.parse(boardPublicId), nameSchema.parse(name), colorSchema.parse(color));
  refreshBoard(data.publicId);
  return data;
}

export async function updateLabelAction(publicId: string, boardPublicId: string, name: string, color: string): Promise<BoardData> {
  const data = await updateLabel(publicIdSchema.parse(publicId), publicIdSchema.parse(boardPublicId), nameSchema.parse(name), colorSchema.parse(color));
  refreshBoard(data.publicId);
  return data;
}

export async function deleteLabelAction(publicId: string, boardPublicId: string): Promise<BoardData> {
  const data = await deleteLabel(publicIdSchema.parse(publicId), publicIdSchema.parse(boardPublicId));
  refreshBoard(data.publicId);
  return data;
}

export async function toggleCardLabelAction(cardPublicId: string, labelPublicId: string): Promise<BoardData> {
  const data = await toggleCardLabel(publicIdSchema.parse(cardPublicId), publicIdSchema.parse(labelPublicId));
  refreshBoard(data.publicId);
  return data;
}

export async function createChecklistAction(cardPublicId: string, title: string): Promise<BoardData> {
  const data = await createChecklist(publicIdSchema.parse(cardPublicId), nameSchema.parse(title));
  refreshBoard(data.publicId);
  return data;
}

export async function deleteChecklistAction(publicId: string): Promise<BoardData> {
  const data = await deleteChecklist(publicIdSchema.parse(publicId));
  refreshBoard(data.publicId);
  return data;
}

export async function createChecklistItemAction(checklistPublicId: string, text: string): Promise<BoardData> {
  const data = await createChecklistItem(publicIdSchema.parse(checklistPublicId), textSchema.parse(text));
  refreshBoard(data.publicId);
  return data;
}

export async function updateChecklistItemAction(input: { publicId: string; text: string; completed: boolean; beforePosition?: number | null; afterPosition?: number | null }): Promise<BoardData> {
  const values = moveSchema.extend({ text: textSchema, completed: z.boolean() }).parse(input);
  const data = await updateChecklistItem(values.publicId, values.text, values.completed, values.beforePosition, values.afterPosition);
  refreshBoard(data.publicId);
  return data;
}

export async function deleteChecklistItemAction(publicId: string): Promise<BoardData> {
  const data = await deleteChecklistItem(publicIdSchema.parse(publicId));
  refreshBoard(data.publicId);
  return data;
}

export async function addCommentAction(cardPublicId: string, text: string): Promise<BoardData> {
  const data = await addComment(publicIdSchema.parse(cardPublicId), textSchema.parse(text));
  refreshBoard(data.publicId);
  return data;
}

export async function deleteCommentAction(publicId: string): Promise<BoardData> {
  const data = await deleteComment(publicIdSchema.parse(publicId));
  refreshBoard(data.publicId);
  return data;
}

export async function saveTemplateAction(boardPublicId: string, name: string, description = ""): Promise<string> {
  const id = await saveBoardAsTemplate(publicIdSchema.parse(boardPublicId), nameSchema.parse(name), z.string().max(2000).parse(description));
  revalidatePath("/templates");
  return id;
}

export async function deleteTemplateAction(publicId: string): Promise<void> {
  await deleteTemplate(publicIdSchema.parse(publicId));
  revalidatePath("/templates");
}

export async function saveSettingsAction(input: AppSettings): Promise<void> {
  const values = settingsSchema.parse(input);
  await saveSettings(values);
  revalidatePath("/", "layout");
}
