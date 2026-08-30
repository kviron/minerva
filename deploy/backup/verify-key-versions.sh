#!/bin/sh
set -eu
. /opt/minerva/lib.sh

database_url="$(read_secret restore_database_url "${RESTORE_DATABASE_URL_FILE:-/run/secrets/restore_database_url}")"
key_file="${CREDENTIAL_ENCRYPTION_KEYS_FILE:-/run/secrets/credential_encryption_keys}"
read_secret credential_encryption_keys "$key_file" >/dev/null

required_versions="$(psql "$database_url" -Atqc '
  select distinct version from (
    select login_key_version as version from credentials where login_key_version is not null
    union select password_key_version from credentials where password_key_version is not null
    union select key_version from credential_fields
    union select api_key_key_version from project_ai_connections
    union select token_key_version from document_public_shares
  ) versions order by version
')"

for version in $required_versions; do
  if ! grep -Eq "(^|,)${version}:[A-Za-z0-9+/]+={0,2}(,|$)" "$key_file"; then
    echo 'Restore encryption-key inventory is incomplete' >&2
    exit 1
  fi
done
echo '{"status":"ok"}'
