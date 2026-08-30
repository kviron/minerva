#!/bin/sh
set -eu
. /opt/minerva/lib.sh

database_url="$(read_secret restore_database_url "${RESTORE_DATABASE_URL_FILE:-/run/secrets/restore_database_url}")"
psql "$database_url" -v ON_ERROR_STOP=1 -Atqc '
  select 1
  from "user", projects, documents, document_versions, audit_events
  limit 1
' >/dev/null
psql "$database_url" -v ON_ERROR_STOP=1 -Atqc '
  select count(*) >= 0 from oauth_grants;
  select count(*) >= 0 from document_public_shares;
  select count(*) >= 0 from credentials;
' | grep -q '^t$'
echo '{"status":"ok"}'
