ALTER TABLE "people" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "people" ALTER COLUMN "status" SET DEFAULT 'visitor'::text;--> statement-breakpoint
ALTER TABLE "person_status_history" ALTER COLUMN "from_status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "person_status_history" ALTER COLUMN "to_status" SET DATA TYPE text;--> statement-breakpoint
UPDATE "people" SET "status" = 'member' WHERE "status" IN ('worker', 'leader');--> statement-breakpoint
UPDATE "person_status_history" SET "from_status" = 'member' WHERE "from_status" IN ('worker', 'leader');--> statement-breakpoint
UPDATE "person_status_history" SET "to_status" = 'member' WHERE "to_status" IN ('worker', 'leader');--> statement-breakpoint
DELETE FROM "person_status_history" WHERE "from_status" = "to_status";--> statement-breakpoint
DROP TYPE "public"."person_status";--> statement-breakpoint
CREATE TYPE "public"."person_status" AS ENUM('visitor', 'regular', 'member', 'inactive');--> statement-breakpoint
ALTER TABLE "people" ALTER COLUMN "status" SET DEFAULT 'visitor'::"public"."person_status";--> statement-breakpoint
ALTER TABLE "people" ALTER COLUMN "status" SET DATA TYPE "public"."person_status" USING "status"::"public"."person_status";--> statement-breakpoint
ALTER TABLE "person_status_history" ALTER COLUMN "from_status" SET DATA TYPE "public"."person_status" USING "from_status"::"public"."person_status";--> statement-breakpoint
ALTER TABLE "person_status_history" ALTER COLUMN "to_status" SET DATA TYPE "public"."person_status" USING "to_status"::"public"."person_status";;--> statement-breakpoint
INSERT INTO "roles" ("church_id", "key", "name", "grants", "is_system")
SELECT "id", 'pastor', '{"en": "Pastor", "fr": "Pasteur"}'::jsonb, '[{"permission": "settings.manage", "scope": "church"}, {"permission": "users.manage", "scope": "church"}, {"permission": "people.read", "scope": "church"}, {"permission": "people.write", "scope": "church"}, {"permission": "teams.read", "scope": "church"}, {"permission": "teams.write", "scope": "church"}, {"permission": "attendance.capture", "scope": "church"}, {"permission": "attendance.read", "scope": "church"}, {"permission": "reports.read", "scope": "church"}, {"permission": "giving.capture", "scope": "church"}, {"permission": "giving.readTotals", "scope": "church"}, {"permission": "giving.readIndividual", "scope": "church"}, {"permission": "payments.request", "scope": "church"}, {"permission": "payments.approve", "scope": "church"}, {"permission": "budgets.read", "scope": "church"}, {"permission": "budgets.manage", "scope": "church"}, {"permission": "inventory.read", "scope": "church"}, {"permission": "inventory.manage", "scope": "church"}, {"permission": "inventory.borrow", "scope": "church"}, {"permission": "audit.read", "scope": "church"}]'::jsonb, true FROM "churches"
ON CONFLICT ("church_id", "key") DO NOTHING;--> statement-breakpoint
INSERT INTO "roles" ("church_id", "key", "name", "grants", "is_system")
SELECT "id", 'teamLeader', '{"en": "Team Leader", "fr": "Chef d''équipe"}'::jsonb, '[{"permission": "people.read", "scope": "church"}, {"permission": "teams.read", "scope": "church"}, {"permission": "people.write", "scope": "team"}, {"permission": "teams.write", "scope": "team"}]'::jsonb, true FROM "churches"
ON CONFLICT ("church_id", "key") DO NOTHING;--> statement-breakpoint
UPDATE "roles" SET "grants" = '[{"permission": "settings.manage", "scope": "church"}, {"permission": "users.manage", "scope": "church"}, {"permission": "people.read", "scope": "church"}, {"permission": "people.write", "scope": "church"}, {"permission": "teams.read", "scope": "church"}, {"permission": "teams.write", "scope": "church"}, {"permission": "attendance.capture", "scope": "church"}, {"permission": "attendance.read", "scope": "church"}, {"permission": "reports.read", "scope": "church"}, {"permission": "giving.capture", "scope": "church"}, {"permission": "giving.readTotals", "scope": "church"}, {"permission": "giving.readIndividual", "scope": "church"}, {"permission": "payments.request", "scope": "church"}, {"permission": "payments.approve", "scope": "church"}, {"permission": "budgets.read", "scope": "church"}, {"permission": "budgets.manage", "scope": "church"}, {"permission": "inventory.read", "scope": "church"}, {"permission": "inventory.manage", "scope": "church"}, {"permission": "inventory.borrow", "scope": "church"}, {"permission": "audit.read", "scope": "church"}]'::jsonb WHERE "key" IN ('pastor', 'churchAdmin');--> statement-breakpoint
UPDATE "roles" SET "grants" = '[{"permission": "people.read", "scope": "church"}, {"permission": "teams.read", "scope": "church"}, {"permission": "people.write", "scope": "team"}, {"permission": "teams.write", "scope": "team"}]'::jsonb WHERE "key" = 'teamLeader';--> statement-breakpoint
UPDATE "memberships" m SET "role_id" = target."id"
FROM "roles" old, "roles" target
WHERE m."role_id" = old."id" AND target."church_id" = old."church_id"
  AND old."key" IN ('seniorPastor', 'financeOfficer', 'treasurer', 'usher', 'inventoryManager', 'member', 'auditor')
  AND target."key" = CASE WHEN old."key" = 'seniorPastor' THEN 'pastor' ELSE 'teamLeader' END;--> statement-breakpoint
UPDATE "invitations" i SET "role_id" = target."id"
FROM "roles" old, "roles" target
WHERE i."role_id" = old."id" AND target."church_id" = old."church_id"
  AND old."key" IN ('seniorPastor', 'financeOfficer', 'treasurer', 'usher', 'inventoryManager', 'member', 'auditor')
  AND target."key" = CASE WHEN old."key" = 'seniorPastor' THEN 'pastor' ELSE 'teamLeader' END;--> statement-breakpoint
DELETE FROM "roles" WHERE "is_system" AND "key" IN ('seniorPastor', 'financeOfficer', 'treasurer', 'usher', 'inventoryManager', 'member', 'auditor');
