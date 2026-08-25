CREATE TABLE "card_colors" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"board_id" integer,
	"section_id" integer,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cards" DROP CONSTRAINT "cards_color_label_id_labels_id_fk";
--> statement-breakpoint
INSERT INTO "card_colors" ("id", "public_id", "board_id", "section_id", "name", "color", "created_at", "updated_at")
SELECT "labels"."id", 'clr_' || substring("labels"."public_id" from 5), "labels"."board_id", "labels"."section_id", "labels"."name", "labels"."color", "labels"."created_at", "labels"."updated_at"
FROM "labels"
WHERE EXISTS (SELECT 1 FROM "cards" WHERE "cards"."color_label_id" = "labels"."id");
--> statement-breakpoint
SELECT setval(pg_get_serial_sequence('card_colors', 'id'), coalesce(max("id"), 1), max("id") is not null) FROM "card_colors";
--> statement-breakpoint
ALTER TABLE "card_colors" ADD CONSTRAINT "card_colors_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_colors" ADD CONSTRAINT "card_colors_section_id_board_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."board_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "card_colors_public_id_idx" ON "card_colors" USING btree ("public_id");--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_color_label_id_card_colors_id_fk" FOREIGN KEY ("color_label_id") REFERENCES "public"."card_colors"("id") ON DELETE set null ON UPDATE no action;
