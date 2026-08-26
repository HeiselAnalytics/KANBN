export interface LabelData {
  publicId: string;
  name: string;
  color: string;
}

export interface CardColorData {
  publicId: string;
  name: string;
  color: string;
}

export interface ChecklistItemData {
  publicId: string;
  text: string;
  completed: boolean;
  position: number;
}

export interface ChecklistData {
  publicId: string;
  title: string;
  position: number;
  items: ChecklistItemData[];
}

export interface CommentData {
  publicId: string;
  text: string;
  createdAt: string;
}

export interface ActivityData {
  publicId: string;
  type: string;
  metadata: Record<string, string>;
  createdAt: string;
}

export interface CardData {
  publicId: string;
  listPublicId: string;
  title: string;
  description: string;
  position: number;
  dueDate: string | null;
  color: CardColorData | null;
  labels: LabelData[];
  checklists: ChecklistData[];
  comments: CommentData[];
  activity: ActivityData[];
}

export interface ListData {
  publicId: string;
  name: string;
  position: number;
  cards: CardData[];
}

export interface BoardData {
  publicId: string;
  name: string;
  updatedAt: string;
  lists: ListData[];
  colors: CardColorData[];
  labels: LabelData[];
}

export interface BoardSummary {
  publicId: string;
  name: string;
  sectionPublicId: string | null;
}

export interface BoardSectionSummary {
  publicId: string;
  name: string;
  icon: string;
  position: number;
}

export interface OverviewCardData extends CardData {
  boardPublicId: string;
  boardName: string;
  sectionPublicId: string | null;
  sectionName: string | null;
  listName: string;
}

export interface OverviewData {
  cards: OverviewCardData[];
  boards: BoardSummary[];
  sections: BoardSectionSummary[];
  colors: CardColorData[];
  labels: LabelData[];
}

export interface TemplateSummary {
  publicId: string;
  name: string;
  description: string;
  listCount: number;
  cardCount: number;
}

export interface AppSettings {
  applicationName: string;
  logoLightUrl: string;
  logoDarkUrl: string;
  defaultBoard: string;
  language: "en" | "de";
  dateFormat: "dd.MM.yyyy" | "MM/dd/yyyy" | "yyyy-MM-dd";
  theme: "light" | "dark" | "system";
  compactCards: boolean;
}
