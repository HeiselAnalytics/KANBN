import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const boardSections = pgTable(
  "board_sections",
  {
    id: serial("id").primaryKey(),
    publicId: text("public_id").notNull(),
    name: text("name").notNull(),
    icon: text("icon").notNull().default("Folder"),
    position: doublePrecision("position").notNull().default(1024),
    ...timestamps,
  },
  (table) => [uniqueIndex("board_sections_public_id_idx").on(table.publicId)],
);

export const boards = pgTable(
  "boards",
  {
    id: serial("id").primaryKey(),
    publicId: text("public_id").notNull(),
    name: text("name").notNull(),
    sectionId: integer("section_id").references(() => boardSections.id, { onDelete: "set null" }),
    position: doublePrecision("position").notNull().default(1024),
    lastOpenedAt: timestamp("last_opened_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [uniqueIndex("boards_public_id_idx").on(table.publicId)],
);

export const lists = pgTable(
  "lists",
  {
    id: serial("id").primaryKey(),
    publicId: text("public_id").notNull(),
    boardId: integer("board_id").notNull().references(() => boards.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: doublePrecision("position").notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("lists_public_id_idx").on(table.publicId),
    index("lists_board_position_idx").on(table.boardId, table.position),
  ],
);

export const cards = pgTable(
  "cards",
  {
    id: serial("id").primaryKey(),
    publicId: text("public_id").notNull(),
    listId: integer("list_id").notNull().references(() => lists.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    position: doublePrecision("position").notNull(),
    dueDate: timestamp("due_date", { withTimezone: true }),
    colorId: integer("color_label_id").references(() => cardColors.id, { onDelete: "set null" }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("cards_public_id_idx").on(table.publicId),
    index("cards_list_position_idx").on(table.listId, table.position),
  ],
);

export const cardColors = pgTable(
  "card_colors",
  {
    id: serial("id").primaryKey(),
    publicId: text("public_id").notNull(),
    boardId: integer("board_id").references(() => boards.id, { onDelete: "cascade" }),
    sectionId: integer("section_id").references(() => boardSections.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("card_colors_public_id_idx").on(table.publicId)],
);

export const labels = pgTable(
  "labels",
  {
    id: serial("id").primaryKey(),
    publicId: text("public_id").notNull(),
    boardId: integer("board_id").references(() => boards.id, { onDelete: "cascade" }),
    sectionId: integer("section_id").references(() => boardSections.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("labels_public_id_idx").on(table.publicId)],
);

export const cardLabels = pgTable(
  "card_labels",
  {
    cardId: integer("card_id").notNull().references(() => cards.id, { onDelete: "cascade" }),
    labelId: integer("label_id").notNull().references(() => labels.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.cardId, table.labelId] })],
);

export const checklists = pgTable(
  "checklists",
  {
    id: serial("id").primaryKey(),
    publicId: text("public_id").notNull(),
    cardId: integer("card_id").notNull().references(() => cards.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    position: doublePrecision("position").notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("checklists_public_id_idx").on(table.publicId)],
);

export const checklistItems = pgTable(
  "checklist_items",
  {
    id: serial("id").primaryKey(),
    publicId: text("public_id").notNull(),
    checklistId: integer("checklist_id").notNull().references(() => checklists.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    completed: boolean("completed").notNull().default(false),
    position: doublePrecision("position").notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("checklist_items_public_id_idx").on(table.publicId)],
);

export const comments = pgTable(
  "comments",
  {
    id: serial("id").primaryKey(),
    publicId: text("public_id").notNull(),
    cardId: integer("card_id").notNull().references(() => cards.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("comments_public_id_idx").on(table.publicId)],
);

export const cardActivity = pgTable("card_activity", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").notNull().unique(),
  cardId: integer("card_id").notNull().references(() => cards.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  metadata: jsonb("metadata").$type<Record<string, string>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export interface TemplateCardData {
  title: string;
  description: string;
  position: number;
}

export interface TemplateListData {
  name: string;
  position: number;
  cards: TemplateCardData[];
}

export interface TemplateData {
  lists: TemplateListData[];
}

export const templates = pgTable(
  "templates",
  {
    id: serial("id").primaryKey(),
    publicId: text("public_id").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    data: jsonb("data").$type<TemplateData>().notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("templates_public_id_idx").on(table.publicId)],
);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
