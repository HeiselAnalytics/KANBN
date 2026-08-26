import type { OverviewCardData, OverviewListSummary } from "@/lib/types";

export const OVERVIEW_FILTER_STORAGE_KEY = "kanbn-overview-filters-v1";
export const NO_SECTION_FILTER = "__without_section__";
export const NO_COLOR_FILTER = "__without_color__";

export type OverviewDueFilter = "all" | "scheduled" | "overdue" | "today" | "next7" | "next14" | "next30" | "none";

export interface OverviewFilters {
  search: string;
  due: OverviewDueFilter;
  sections: string[];
  boards: string[];
  lists: string[];
  colors: string[];
  labels: string[];
}

export const DEFAULT_OVERVIEW_FILTERS: OverviewFilters = {
  search: "",
  due: "next14",
  sections: [],
  boards: [],
  lists: [],
  colors: [],
  labels: [],
};

const DUE_FILTERS = new Set<OverviewDueFilter>(["all", "scheduled", "overdue", "today", "next7", "next14", "next30", "none"]);

function normalizedListName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function overviewListFilterKey(name: string): string {
  return `list-name:${normalizedListName(name)}`;
}

export function getOverviewListFilterOptions(lists: OverviewListSummary[]): { id: string; name: string }[] {
  const options = new Map<string, string>();
  for (const list of lists) {
    const id = overviewListFilterKey(list.name);
    if (!options.has(id)) options.set(id, list.name.trim());
  }
  return Array.from(options, ([id, name]) => ({ id, name }));
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

export function parseOverviewFilters(value: unknown): OverviewFilters {
  if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULT_OVERVIEW_FILTERS;
  const candidate = value as Partial<Record<keyof OverviewFilters, unknown>>;
  return {
    search: typeof candidate.search === "string" ? candidate.search : "",
    due: typeof candidate.due === "string" && DUE_FILTERS.has(candidate.due as OverviewDueFilter) ? candidate.due as OverviewDueFilter : DEFAULT_OVERVIEW_FILTERS.due,
    sections: stringArray(candidate.sections),
    boards: stringArray(candidate.boards),
    lists: stringArray(candidate.lists),
    colors: stringArray(candidate.colors),
    labels: stringArray(candidate.labels),
  };
}

function isSameLocalDay(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function matchesDueDate(dueDate: string | null, filter: OverviewDueFilter, now: number): boolean {
  if (filter === "all") return true;
  if (filter === "none") return !dueDate;
  if (!dueDate) return false;
  const due = new Date(dueDate).getTime();
  if (filter === "scheduled") return true;
  if (filter === "overdue") return due < now;
  if (filter === "today") return isSameLocalDay(new Date(due), new Date(now));
  const days = filter === "next7" ? 7 : filter === "next14" ? 14 : 30;
  return due >= now && due <= now + days * 24 * 60 * 60 * 1000;
}

export function matchesOverviewFilters(card: OverviewCardData, filters: OverviewFilters, now: number): boolean {
  const sectionId = card.sectionPublicId ?? NO_SECTION_FILTER;
  if (filters.sections.length && !filters.sections.includes(sectionId)) return false;
  if (filters.boards.length && !filters.boards.includes(card.boardPublicId)) return false;
  if (filters.lists.length && !filters.lists.includes(overviewListFilterKey(card.listName))) return false;
  const colorId = card.color?.publicId ?? NO_COLOR_FILTER;
  if (filters.colors.length && !filters.colors.includes(colorId)) return false;
  if (filters.labels.length && !filters.labels.some((labelId) => card.labels.some((label) => label.publicId === labelId))) return false;
  if (!matchesDueDate(card.dueDate, filters.due, now)) return false;

  const search = filters.search.trim().toLocaleLowerCase();
  if (!search) return true;
  return [card.title, card.description, card.boardName, card.sectionName ?? "", card.listName, card.color?.name ?? "", ...card.labels.map((label) => label.name)]
    .join(" ")
    .toLocaleLowerCase()
    .includes(search);
}

export function sortOverviewCards(left: OverviewCardData, right: OverviewCardData): number {
  if (left.dueDate && right.dueDate) return new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime();
  if (left.dueDate) return -1;
  if (right.dueDate) return 1;
  return left.title.localeCompare(right.title);
}
