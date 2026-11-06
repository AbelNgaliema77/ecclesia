CREATE OR REPLACE FUNCTION app_current_church_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.church_id', true), '')::uuid
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_touch_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;
--> statement-breakpoint
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'roles', 'campuses', 'households', 'people', 'person_status_history', 'teams',
    'positions', 'assignments', 'attendance_categories', 'service_types', 'services',
    'headcounts', 'audit_log'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY church_isolation ON %I USING (church_id = app_current_church_id()) WITH CHECK (church_id = app_current_church_id())',
      t
    );
  END LOOP;

  FOREACH t IN ARRAY ARRAY[
    'user', 'session', 'account', 'verification', 'churches', 'subscriptions', 'roles',
    'campuses', 'households', 'people', 'teams', 'positions', 'assignments',
    'attendance_categories', 'service_types', 'services', 'headcounts'
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
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'ecclesia_app') THEN
    GRANT USAGE ON SCHEMA public TO ecclesia_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ecclesia_app;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ecclesia_app;
    GRANT EXECUTE ON FUNCTION app_current_church_id() TO ecclesia_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ecclesia_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ecclesia_app;
    REVOKE UPDATE, DELETE ON audit_log FROM ecclesia_app;
  END IF;
END
$$;
