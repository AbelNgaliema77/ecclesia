ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY church_isolation ON invitations
  USING (church_id = app_current_church_id())
  WITH CHECK (church_id = app_current_church_id());
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_invitation_church(p_token_hash text) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT church_id FROM invitations WHERE token_hash = p_token_hash
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION app_invitation_church(text) FROM PUBLIC;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'ecclesia_app') THEN
    GRANT EXECUTE ON FUNCTION app_invitation_church(text) TO ecclesia_app;
  END IF;
END
$$;
