CREATE FUNCTION minerva_require_active_oauth_grant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  grant_status text;
BEGIN
  IF NEW.reference_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT status
  INTO grant_status
  FROM oauth_grants
  WHERE id = NEW.reference_id::uuid
  FOR KEY SHARE;

  IF grant_status IS NULL OR grant_status <> 'active' THEN
    RAISE EXCEPTION 'OAuth token requires an active grant'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'OAuth token grant reference must be a UUID'
      USING ERRCODE = '23514';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER oauth_refresh_token_active_grant_guard
BEFORE INSERT OR UPDATE OF reference_id ON oauth_refresh_token
FOR EACH ROW
EXECUTE FUNCTION minerva_require_active_oauth_grant();
--> statement-breakpoint
CREATE TRIGGER oauth_access_token_active_grant_guard
BEFORE INSERT OR UPDATE OF reference_id ON oauth_access_token
FOR EACH ROW
EXECUTE FUNCTION minerva_require_active_oauth_grant();
