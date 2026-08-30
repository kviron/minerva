#!/bin/sh
set -eu

root="${MINERVA_ROOT:-/opt/minerva}"
environment_file="${MINERVA_ENV_FILE:-/etc/minerva/production.env}"
secret_root="${MINERVA_SECRET_ROOT:-/etc/minerva/secrets}"

for name in database_url postgres_password better_auth_secret rate_limit_hmac_secret credential_encryption_keys s3_access_key_id s3_secret_access_key backup_repository restic_password backup_access_key_id backup_secret_access_key object_audit_access_key_id object_audit_secret_access_key; do
  path="$secret_root/$name"
  if [ ! -f "$path" ] || [ ! -r "$path" ] || [ -L "$path" ]; then
    echo "Production secret preflight failed: $name" >&2
    exit 1
  fi
  mode="$(stat -c '%a' "$path")"
  case "$mode" in 400|600|640) ;; *) echo "Production secret permissions failed: $name" >&2; exit 1 ;; esac
done

cd "$root"
docker compose --env-file "$environment_file" -f compose.production.yml config --quiet
docker compose --env-file "$environment_file" -f compose.production.yml --profile backup-preflight run --rm backup-preflight
