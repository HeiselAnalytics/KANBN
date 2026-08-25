ALTER TABLE "labels" ALTER COLUMN "board_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "board_sections" ADD COLUMN "icon" text DEFAULT 'Folder' NOT NULL;--> statement-breakpoint
ALTER TABLE "labels" ADD COLUMN "section_id" integer;--> statement-breakpoint
ALTER TABLE "labels" ADD CONSTRAINT "labels_section_id_board_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."board_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
UPDATE "labels" SET "section_id" = "boards"."section_id", "board_id" = NULL FROM "boards" WHERE "labels"."board_id" = "boards"."id" AND "boards"."section_id" IS NOT NULL;
