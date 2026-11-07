CREATE TABLE "church_logos" (
	"church_id" uuid PRIMARY KEY NOT NULL,
	"content_type" text NOT NULL,
	"data" "bytea" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "church_logos_content_type" CHECK (content_type in ('image/png', 'image/jpeg', 'image/webp')),
	CONSTRAINT "church_logos_size" CHECK (octet_length(data) <= 524288)
);
--> statement-breakpoint
ALTER TABLE "churches" ALTER COLUMN "branding" SET DEFAULT '{"theme":null,"logoVersion":null}'::jsonb;--> statement-breakpoint
ALTER TABLE "church_logos" ADD CONSTRAINT "church_logos_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "church_logos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY church_isolation ON "church_logos" USING (church_id = app_current_church_id()) WITH CHECK (church_id = app_current_church_id());--> statement-breakpoint
UPDATE "churches" SET "branding" = '{"theme":null,"logoVersion":null}'::jsonb;
