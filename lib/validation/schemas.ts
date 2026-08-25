import { z } from "zod";

export const publicIdSchema = z.string().regex(/^[a-z]{3}_[A-Za-z0-9_-]{8,}$/);
export const nameSchema = z.string().trim().min(1).max(120);
export const titleSchema = z.string().trim().min(1).max(240);
export const colorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
export const sectionIconSchema = z.enum(["Folder", "Megaphone", "Settings", "Sailboat", "Briefcase", "Rocket", "Code", "Palette", "ShoppingBag", "CalendarDays", "CircleDollarSign", "Wrench"]);

export const createBoardSchema = z.object({
  name: nameSchema,
  templatePublicId: publicIdSchema.optional().or(z.literal("")).or(z.literal("default")),
  sectionPublicId: publicIdSchema.optional().or(z.literal("")),
});

export const moveSchema = z.object({
  publicId: publicIdSchema,
  beforePosition: z.number().finite().nullable().optional(),
  afterPosition: z.number().finite().nullable().optional(),
});

export const cardUpdateSchema = z.object({
  publicId: publicIdSchema,
  title: titleSchema,
  description: z.string().max(20_000),
  dueDate: z.string().datetime().nullable(),
});

export const settingsSchema = z.object({
  applicationName: nameSchema,
  defaultBoard: z.string().max(80),
  language: z.enum(["en", "de"]),
  dateFormat: z.enum(["dd.MM.yyyy", "MM/dd/yyyy", "yyyy-MM-dd"]),
  theme: z.enum(["light", "dark", "system"]),
  compactCards: z.boolean(),
});
