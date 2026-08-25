import { z } from "zod";

const date = z.string().datetime();
const nullableDate = date.nullable();
const base = { id: z.number().int().positive(), publicId: z.string().min(5), createdAt: date, updatedAt: date };

export const backupSchema = z.object({
  version: z.literal(1),
  exportedAt: date,
  data: z.object({
    boardSections: z.array(z.object({ ...base, name: z.string(), icon: z.string().optional().default("Folder"), position: z.number() })).optional().default([]),
    boards: z.array(z.object({ ...base, name: z.string(), sectionId: z.number().int().nullable().optional(), position: z.number(), lastOpenedAt: nullableDate, deletedAt: nullableDate })),
    lists: z.array(z.object({ ...base, boardId: z.number().int(), name: z.string(), position: z.number(), deletedAt: nullableDate })),
    cards: z.array(z.object({ ...base, listId: z.number().int(), title: z.string(), description: z.string(), position: z.number(), dueDate: nullableDate, colorId: z.number().int().nullable().optional(), colorLabelId: z.number().int().nullable().optional(), deletedAt: nullableDate })),
    cardColors: z.array(z.object({ ...base, boardId: z.number().int().nullable(), sectionId: z.number().int().nullable(), name: z.string(), color: z.string() })).optional().default([]),
    labels: z.array(z.object({ ...base, boardId: z.number().int().nullable(), sectionId: z.number().int().nullable().optional(), name: z.string(), color: z.string() })),
    cardLabels: z.array(z.object({ cardId: z.number().int(), labelId: z.number().int() })),
    checklists: z.array(z.object({ ...base, cardId: z.number().int(), title: z.string(), position: z.number() })),
    checklistItems: z.array(z.object({ ...base, checklistId: z.number().int(), text: z.string(), completed: z.boolean(), position: z.number() })),
    comments: z.array(z.object({ ...base, cardId: z.number().int(), text: z.string() })),
    cardActivity: z.array(z.object({ id: z.number().int(), publicId: z.string(), cardId: z.number().int(), type: z.string(), metadata: z.record(z.string(), z.string()), createdAt: date })),
    templates: z.array(z.object({ ...base, name: z.string(), description: z.string(), data: z.object({ lists: z.array(z.object({ name: z.string(), position: z.number(), cards: z.array(z.object({ title: z.string(), description: z.string(), position: z.number() })) })) }) })),
    settings: z.array(z.object({ key: z.string(), value: z.string(), updatedAt: date })),
  }),
});

export type Backup = z.infer<typeof backupSchema>;
