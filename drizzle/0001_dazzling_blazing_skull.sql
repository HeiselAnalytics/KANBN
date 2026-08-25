CREATE TABLE "board_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_id" text NOT NULL,
	"name" text NOT NULL,
	"position" double precision DEFAULT 1024 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "boards" ADD COLUMN "section_id" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "board_sections_public_id_idx" ON "board_sections" USING btree ("public_id");--> statement-breakpoint
ALTER TABLE "boards" ADD CONSTRAINT "boards_section_id_board_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."board_sections"("id") ON DELETE set null ON UPDATE no action;