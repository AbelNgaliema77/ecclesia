CREATE TYPE "public"."attachment_kind" AS ENUM('quote', 'receipt', 'proofOfPayment');--> statement-breakpoint
CREATE TYPE "public"."bank_line_status" AS ENUM('matched', 'ignored');--> statement-breakpoint
CREATE TYPE "public"."batch_status" AS ENUM('draft', 'submitted', 'verified');--> statement-breakpoint
CREATE TYPE "public"."expense_decision" AS ENUM('approve', 'reject');--> statement-breakpoint
CREATE TYPE "public"."expense_status" AS ENUM('submitted', 'approved', 'rejected', 'paid', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."giving_method" AS ENUM('cash', 'eft', 'card', 'other');--> statement-breakpoint
CREATE TABLE "two_factor" (
	"id" text PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"verified" boolean DEFAULT true NOT NULL,
	"failed_verification_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"imported_by" text,
	"line_count" integer NOT NULL,
	"gift_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bank_imports_churchId_id_unique" UNIQUE("church_id","id")
);
--> statement-breakpoint
CREATE TABLE "bank_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid NOT NULL,
	"import_id" uuid NOT NULL,
	"posted_on" date NOT NULL,
	"description" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"fingerprint" text NOT NULL,
	"status" "bank_line_status" NOT NULL,
	"gift_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bank_lines_churchId_fingerprint_unique" UNIQUE("church_id","fingerprint")
);
--> statement-breakpoint
CREATE TABLE "budget_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid NOT NULL,
	"year" smallint NOT NULL,
	"category_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budget_lines_churchId_year_categoryId_unique" UNIQUE("church_id","year","category_id"),
	CONSTRAINT "budget_lines_amount_valid" CHECK ("budget_lines"."amount_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "donor_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"giving_number" text,
	"tax_number" text,
	"address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "donor_profiles_churchId_id_unique" UNIQUE("church_id","id"),
	CONSTRAINT "donor_profiles_churchId_personId_unique" UNIQUE("church_id","person_id"),
	CONSTRAINT "donor_profiles_churchId_givingNumber_unique" UNIQUE("church_id","giving_number")
);
--> statement-breakpoint
CREATE TABLE "expense_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"approver_id" text,
	"decision" "expense_decision" NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expense_approvals_churchId_requestId_approverId_unique" UNIQUE("church_id","request_id","approver_id")
);
--> statement-breakpoint
CREATE TABLE "expense_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"kind" "attachment_kind" NOT NULL,
	"file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"data" "bytea" NOT NULL,
	"uploaded_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expense_attachments_churchId_id_unique" UNIQUE("church_id","id"),
	CONSTRAINT "expense_attachments_type_valid" CHECK (content_type in ('image/png', 'image/jpeg', 'image/webp', 'application/pdf')),
	CONSTRAINT "expense_attachments_size_valid" CHECK (byte_size > 0 AND byte_size <= 5242880 AND octet_length(data) = byte_size)
);
--> statement-breakpoint
CREATE TABLE "expense_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid NOT NULL,
	"name" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expense_categories_churchId_id_unique" UNIQUE("church_id","id")
);
--> statement-breakpoint
CREATE TABLE "expense_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"payee" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"category_id" uuid NOT NULL,
	"fund_id" uuid NOT NULL,
	"team_id" uuid,
	"needed_by" date,
	"status" "expense_status" DEFAULT 'submitted' NOT NULL,
	"requested_by" text,
	"decided_at" timestamp with time zone,
	"paid_on" date,
	"paid_by" text,
	"paid_at" timestamp with time zone,
	"payment_reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expense_requests_churchId_id_unique" UNIQUE("church_id","id"),
	CONSTRAINT "expense_requests_churchId_number_unique" UNIQUE("church_id","number"),
	CONSTRAINT "expense_requests_amount_valid" CHECK ("expense_requests"."amount_cents" > 0 AND "expense_requests"."amount_cents" <= 1000000000),
	CONSTRAINT "expense_requests_paid_complete" CHECK ("expense_requests"."status" <> 'paid' OR ("expense_requests"."paid_on" IS NOT NULL AND "expense_requests"."payment_reference" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "finance_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid NOT NULL,
	"month" date NOT NULL,
	"closed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_by" text,
	CONSTRAINT "finance_periods_churchId_month_unique" UNIQUE("church_id","month"),
	CONSTRAINT "finance_periods_first_of_month" CHECK (extract(day from "finance_periods"."month") = 1)
);
--> statement-breakpoint
CREATE TABLE "finance_settings" (
	"church_id" uuid PRIMARY KEY NOT NULL,
	"default_fund_id" uuid,
	"finance_team_id" uuid,
	"second_approval_above_cents" integer,
	"require_two_factor" boolean DEFAULT true NOT NULL,
	"legal_name" text,
	"pbo_number" text,
	"address" text,
	"signatory_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "finance_settings_second_approval_valid" CHECK ("finance_settings"."second_approval_above_cents" IS NULL OR "finance_settings"."second_approval_above_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "funds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" jsonb NOT NULL,
	"tax_deductible" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "funds_churchId_id_unique" UNIQUE("church_id","id"),
	CONSTRAINT "funds_churchId_code_unique" UNIQUE("church_id","code")
);
--> statement-breakpoint
CREATE TABLE "gift_batch_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid NOT NULL,
	"batch_id" uuid NOT NULL,
	"fund_id" uuid NOT NULL,
	"person_id" uuid,
	"amount_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gift_batch_lines_amount_valid" CHECK ("gift_batch_lines"."amount_cents" > 0 AND "gift_batch_lines"."amount_cents" <= 1000000000)
);
--> statement-breakpoint
CREATE TABLE "gift_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid NOT NULL,
	"received_on" date NOT NULL,
	"service_id" uuid,
	"status" "batch_status" DEFAULT 'draft' NOT NULL,
	"notes" text,
	"created_by" text,
	"submitted_by" text,
	"submitted_at" timestamp with time zone,
	"verified_by" text,
	"verified_at" timestamp with time zone,
	"returned_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gift_batches_churchId_id_unique" UNIQUE("church_id","id"),
	CONSTRAINT "gift_batches_two_people" CHECK ("gift_batches"."verified_by" IS NULL OR "gift_batches"."submitted_by" IS NULL OR "gift_batches"."verified_by" <> "gift_batches"."submitted_by")
);
--> statement-breakpoint
CREATE TABLE "gifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid NOT NULL,
	"fund_id" uuid NOT NULL,
	"person_id" uuid,
	"method" "giving_method" NOT NULL,
	"amount_cents" integer NOT NULL,
	"received_on" date NOT NULL,
	"reference" text,
	"batch_id" uuid,
	"bank_import_id" uuid,
	"recorded_by" text,
	"voided_at" timestamp with time zone,
	"voided_by" text,
	"void_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gifts_churchId_id_unique" UNIQUE("church_id","id"),
	CONSTRAINT "gifts_amount_valid" CHECK ("gifts"."amount_cents" > 0 AND "gifts"."amount_cents" <= 1000000000),
	CONSTRAINT "gifts_void_complete" CHECK (("gifts"."voided_at" IS NULL AND "gifts"."void_reason" IS NULL) OR ("gifts"."voided_at" IS NOT NULL AND "gifts"."void_reason" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "tax_certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"tax_year" smallint NOT NULL,
	"sequence" integer NOT NULL,
	"amount_cents" integer NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"issued_by" text,
	CONSTRAINT "tax_certificates_churchId_personId_taxYear_unique" UNIQUE("church_id","person_id","tax_year"),
	CONSTRAINT "tax_certificates_churchId_taxYear_sequence_unique" UNIQUE("church_id","tax_year","sequence"),
	CONSTRAINT "tax_certificates_amount_valid" CHECK ("tax_certificates"."amount_cents" > 0)
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "two_factor_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "two_factor" ADD CONSTRAINT "two_factor_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_imports" ADD CONSTRAINT "bank_imports_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_imports" ADD CONSTRAINT "bank_imports_imported_by_user_id_fk" FOREIGN KEY ("imported_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_lines" ADD CONSTRAINT "bank_lines_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_lines" ADD CONSTRAINT "bank_lines_church_id_import_id_bank_imports_church_id_id_fk" FOREIGN KEY ("church_id","import_id") REFERENCES "public"."bank_imports"("church_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_lines" ADD CONSTRAINT "bank_lines_church_id_gift_id_gifts_church_id_id_fk" FOREIGN KEY ("church_id","gift_id") REFERENCES "public"."gifts"("church_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_church_id_category_id_expense_categories_church_id_id_fk" FOREIGN KEY ("church_id","category_id") REFERENCES "public"."expense_categories"("church_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donor_profiles" ADD CONSTRAINT "donor_profiles_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donor_profiles" ADD CONSTRAINT "donor_profiles_church_id_person_id_people_church_id_id_fk" FOREIGN KEY ("church_id","person_id") REFERENCES "public"."people"("church_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_approvals" ADD CONSTRAINT "expense_approvals_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_approvals" ADD CONSTRAINT "expense_approvals_approver_id_user_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_approvals" ADD CONSTRAINT "expense_approvals_church_id_request_id_expense_requests_church_id_id_fk" FOREIGN KEY ("church_id","request_id") REFERENCES "public"."expense_requests"("church_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_attachments" ADD CONSTRAINT "expense_attachments_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_attachments" ADD CONSTRAINT "expense_attachments_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_attachments" ADD CONSTRAINT "expense_attachments_church_id_request_id_expense_requests_church_id_id_fk" FOREIGN KEY ("church_id","request_id") REFERENCES "public"."expense_requests"("church_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_requests" ADD CONSTRAINT "expense_requests_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_requests" ADD CONSTRAINT "expense_requests_requested_by_user_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_requests" ADD CONSTRAINT "expense_requests_paid_by_user_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_requests" ADD CONSTRAINT "expense_requests_church_id_category_id_expense_categories_church_id_id_fk" FOREIGN KEY ("church_id","category_id") REFERENCES "public"."expense_categories"("church_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_requests" ADD CONSTRAINT "expense_requests_church_id_fund_id_funds_church_id_id_fk" FOREIGN KEY ("church_id","fund_id") REFERENCES "public"."funds"("church_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_requests" ADD CONSTRAINT "expense_requests_church_id_team_id_teams_church_id_id_fk" FOREIGN KEY ("church_id","team_id") REFERENCES "public"."teams"("church_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_periods" ADD CONSTRAINT "finance_periods_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_periods" ADD CONSTRAINT "finance_periods_closed_by_user_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_settings" ADD CONSTRAINT "finance_settings_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_settings" ADD CONSTRAINT "finance_settings_default_fund_id_funds_id_fk" FOREIGN KEY ("default_fund_id") REFERENCES "public"."funds"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_settings" ADD CONSTRAINT "finance_settings_finance_team_id_teams_id_fk" FOREIGN KEY ("finance_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "funds" ADD CONSTRAINT "funds_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_batch_lines" ADD CONSTRAINT "gift_batch_lines_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_batch_lines" ADD CONSTRAINT "gift_batch_lines_church_id_batch_id_gift_batches_church_id_id_fk" FOREIGN KEY ("church_id","batch_id") REFERENCES "public"."gift_batches"("church_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_batch_lines" ADD CONSTRAINT "gift_batch_lines_church_id_fund_id_funds_church_id_id_fk" FOREIGN KEY ("church_id","fund_id") REFERENCES "public"."funds"("church_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_batch_lines" ADD CONSTRAINT "gift_batch_lines_church_id_person_id_people_church_id_id_fk" FOREIGN KEY ("church_id","person_id") REFERENCES "public"."people"("church_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_batches" ADD CONSTRAINT "gift_batches_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_batches" ADD CONSTRAINT "gift_batches_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_batches" ADD CONSTRAINT "gift_batches_submitted_by_user_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_batches" ADD CONSTRAINT "gift_batches_verified_by_user_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_batches" ADD CONSTRAINT "gift_batches_church_id_service_id_services_church_id_id_fk" FOREIGN KEY ("church_id","service_id") REFERENCES "public"."services"("church_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gifts" ADD CONSTRAINT "gifts_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gifts" ADD CONSTRAINT "gifts_recorded_by_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gifts" ADD CONSTRAINT "gifts_voided_by_user_id_fk" FOREIGN KEY ("voided_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gifts" ADD CONSTRAINT "gifts_church_id_fund_id_funds_church_id_id_fk" FOREIGN KEY ("church_id","fund_id") REFERENCES "public"."funds"("church_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gifts" ADD CONSTRAINT "gifts_church_id_person_id_people_church_id_id_fk" FOREIGN KEY ("church_id","person_id") REFERENCES "public"."people"("church_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gifts" ADD CONSTRAINT "gifts_church_id_batch_id_gift_batches_church_id_id_fk" FOREIGN KEY ("church_id","batch_id") REFERENCES "public"."gift_batches"("church_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gifts" ADD CONSTRAINT "gifts_church_id_bank_import_id_bank_imports_church_id_id_fk" FOREIGN KEY ("church_id","bank_import_id") REFERENCES "public"."bank_imports"("church_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_certificates" ADD CONSTRAINT "tax_certificates_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_certificates" ADD CONSTRAINT "tax_certificates_issued_by_user_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_certificates" ADD CONSTRAINT "tax_certificates_church_id_person_id_people_church_id_id_fk" FOREIGN KEY ("church_id","person_id") REFERENCES "public"."people"("church_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "two_factor_user_id_index" ON "two_factor" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "expense_attachments_church_id_request_id_index" ON "expense_attachments" USING btree ("church_id","request_id");--> statement-breakpoint
CREATE INDEX "expense_requests_church_id_status_index" ON "expense_requests" USING btree ("church_id","status");--> statement-breakpoint
CREATE INDEX "expense_requests_church_id_paid_on_index" ON "expense_requests" USING btree ("church_id","paid_on");--> statement-breakpoint
CREATE INDEX "gift_batch_lines_church_id_batch_id_index" ON "gift_batch_lines" USING btree ("church_id","batch_id");--> statement-breakpoint
CREATE INDEX "gift_batches_church_id_status_received_on_index" ON "gift_batches" USING btree ("church_id","status","received_on");--> statement-breakpoint
CREATE INDEX "gifts_church_id_received_on_index" ON "gifts" USING btree ("church_id","received_on");--> statement-breakpoint
CREATE INDEX "gifts_church_id_person_id_received_on_index" ON "gifts" USING btree ("church_id","person_id","received_on");--> statement-breakpoint
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'funds', 'expense_categories', 'finance_settings', 'donor_profiles', 'gift_batches',
    'gift_batch_lines', 'bank_imports', 'gifts', 'bank_lines', 'expense_requests',
    'expense_approvals', 'expense_attachments', 'budget_lines', 'finance_periods', 'tax_certificates'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY church_isolation ON %I USING (church_id = app_current_church_id()) WITH CHECK (church_id = app_current_church_id())',
      t
    );
  END LOOP;

  FOREACH t IN ARRAY ARRAY[
    'two_factor', 'funds', 'expense_categories', 'finance_settings', 'donor_profiles', 'gift_batches',
    'gift_batch_lines', 'expense_requests', 'budget_lines'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER touch_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION app_touch_updated_at()',
      t
    );
  END LOOP;
END
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_gifts_only_void() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.voided_at IS NOT NULL THEN
    RAISE EXCEPTION 'gift % is already void', OLD.id USING ERRCODE = 'check_violation';
  END IF;
  IF (NEW.church_id, NEW.fund_id, NEW.person_id, NEW.method, NEW.amount_cents, NEW.received_on,
      NEW.reference, NEW.batch_id, NEW.bank_import_id, NEW.recorded_by, NEW.created_at)
     IS DISTINCT FROM
     (OLD.church_id, OLD.fund_id, OLD.person_id, OLD.method, OLD.amount_cents, OLD.received_on,
      OLD.reference, OLD.batch_id, OLD.bank_import_id, OLD.recorded_by, OLD.created_at) THEN
    RAISE EXCEPTION 'gifts cannot be changed, only voided' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER gifts_only_void BEFORE UPDATE ON "gifts" FOR EACH ROW EXECUTE FUNCTION app_gifts_only_void();
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'ecclesia_app') THEN
    REVOKE DELETE ON "gifts", "bank_lines", "bank_imports", "expense_approvals", "tax_certificates" FROM ecclesia_app;
    REVOKE UPDATE ON "expense_approvals", "bank_lines", "bank_imports" FROM ecclesia_app;
  END IF;
END
$$;
--> statement-breakpoint
UPDATE "roles" SET "grants" = '[{"permission": "settings.manage", "scope": "church"}, {"permission": "users.manage", "scope": "church"}, {"permission": "people.read", "scope": "church"}, {"permission": "people.write", "scope": "church"}, {"permission": "teams.read", "scope": "church"}, {"permission": "teams.write", "scope": "church"}, {"permission": "attendance.capture", "scope": "church"}, {"permission": "attendance.read", "scope": "church"}, {"permission": "reports.read", "scope": "church"}, {"permission": "giving.capture", "scope": "church"}, {"permission": "giving.readTotals", "scope": "church"}, {"permission": "giving.readIndividual", "scope": "church"}, {"permission": "payments.request", "scope": "church"}, {"permission": "payments.approve", "scope": "church"}, {"permission": "budgets.read", "scope": "church"}, {"permission": "budgets.manage", "scope": "church"}, {"permission": "finance.manage", "scope": "church"}, {"permission": "inventory.read", "scope": "church"}, {"permission": "inventory.manage", "scope": "church"}, {"permission": "inventory.borrow", "scope": "church"}, {"permission": "audit.read", "scope": "church"}]'::jsonb WHERE "key" IN ('pastor', 'churchAdmin') AND "is_system";--> statement-breakpoint
UPDATE "roles" SET "grants" = '[{"permission": "people.read", "scope": "church"}, {"permission": "teams.read", "scope": "church"}, {"permission": "people.write", "scope": "team"}, {"permission": "teams.write", "scope": "team"}, {"permission": "payments.request", "scope": "team"}]'::jsonb WHERE "key" = 'teamLeader' AND "is_system";--> statement-breakpoint
INSERT INTO "funds" ("church_id", "code", "name", "tax_deductible", "sort_order")
SELECT c."id", f.code, f.name::jsonb, true, f.sort_order
FROM "churches" c CROSS JOIN (VALUES ('TITHE', '{"en": "Tithe", "fr": "Dîme"}', 0), ('OFFERING', '{"en": "Offering", "fr": "Offrande"}', 1), ('BUILDING', '{"en": "Building fund", "fr": "Fonds de construction"}', 2), ('MISSIONS', '{"en": "Missions", "fr": "Missions"}', 3)) AS f(code, name, sort_order)
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "expense_categories" ("church_id", "name", "sort_order")
SELECT c."id", e.name::jsonb, e.sort_order
FROM "churches" c CROSS JOIN (VALUES ('{"en": "Rent and utilities", "fr": "Loyer et charges"}', 0), ('{"en": "Salaries and honoraria", "fr": "Salaires et honoraires"}', 1), ('{"en": "Ministry and events", "fr": "Ministère et événements"}', 2), ('{"en": "Equipment", "fr": "Équipement"}', 3), ('{"en": "Maintenance", "fr": "Entretien"}', 4), ('{"en": "Outreach and missions", "fr": "Évangélisation et missions"}', 5), ('{"en": "Administration", "fr": "Administration"}', 6)) AS e(name, sort_order);--> statement-breakpoint
INSERT INTO "finance_settings" ("church_id", "default_fund_id")
SELECT c."id", (SELECT f."id" FROM "funds" f WHERE f."church_id" = c."id" AND f."code" = 'TITHE')
FROM "churches" c
ON CONFLICT DO NOTHING;
