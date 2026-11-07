ALTER TABLE "people" ADD COLUMN "joined_year" smallint;--> statement-breakpoint
UPDATE "people" SET "joined_year" = extract(year from "first_visit_on")::smallint WHERE "first_visit_on" IS NOT NULL AND extract(year from "first_visit_on") >= 1900;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_joined_year_valid" CHECK (joined_year IS NULL OR joined_year >= 1900);--> statement-breakpoint
ALTER TABLE "people" DROP CONSTRAINT "people_church_id_household_id_households_church_id_id_fk";--> statement-breakpoint
DROP INDEX "people_church_id_status_index";--> statement-breakpoint
ALTER TABLE "people" DROP COLUMN "preferred_name";--> statement-breakpoint
ALTER TABLE "people" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "people" DROP COLUMN "first_visit_on";--> statement-breakpoint
ALTER TABLE "people" DROP COLUMN "household_id";--> statement-breakpoint
ALTER TABLE "people" DROP COLUMN "notes";--> statement-breakpoint
DROP TABLE "person_status_history";--> statement-breakpoint
DROP TABLE "households";--> statement-breakpoint
DROP TYPE "public"."person_status";
