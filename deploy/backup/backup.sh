#!/bin/sh
set -eu
. /opt/minerva/lib.sh

stage="$(mktemp -d /backup-stage/minerva-backup.XXXXXX)"
trap 'rm -rf "$stage"' EXIT HUP INT TERM

configure_restic
require_safe_release_identity
database_url="$(read_secret database_url "${DATABASE_URL_FILE:-/run/secrets/database_url}")"

available_kib="$(df -Pk /backup-stage | awk 'NR == 2 { print $4 }')"
minimum_kib="${BACKUP_MIN_FREE_KIB:-1048576}"
case "$minimum_kib" in ''|*[!0-9]*) echo 'Backup disk policy is invalid' >&2; exit 1 ;; esac
if [ "$available_kib" -lt "$minimum_kib" ]; then
  echo 'Backup staging capacity is unavailable' >&2
  exit 1
fi

if ! restic cat config >/dev/null 2>&1; then
  echo 'Backup repository is unavailable' >&2
  exit 1
fi
if ! pg_dump --format=custom --no-owner --no-privileges --file="$stage/minerva.dump" "$database_url" 2>/dev/null; then
  echo 'Database backup failed' >&2
  exit 1
fi
dump_sha256="$(sha256sum "$stage/minerva.dump" | awk '{ print $1 }')"
created_at="$(date -u +'%Y-%m-%dT%H:%M:%S.000Z')"

jq -cn \
  --arg createdAt "$created_at" \
  --argjson migrationCreatedAt "$REQUIRED_MIGRATION_CREATED_AT" \
  --arg appImageDigest "$APP_IMAGE_DIGEST" \
  --arg dumpSha256 "$dump_sha256" \
  '{formatVersion:1,createdAt:$createdAt,migrationCreatedAt:$migrationCreatedAt,appImageDigest:$appImageDigest,dumpSha256:$dumpSha256,dumpFilename:"minerva.dump"}' \
  > "$stage/manifest.json"

if ! tar -C "$stage" -cf - minerva.dump manifest.json \
  | restic backup --stdin --stdin-filename minerva-backup.tar --host minerva-production --tag minerva-db >/dev/null 2>&1; then
  echo 'Encrypted backup snapshot failed' >&2
  exit 1
fi
if ! restic forget --host minerva-production --tag minerva-db --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune >/dev/null 2>&1; then
  echo 'Backup retention failed' >&2
  exit 1
fi
echo '{"status":"ok"}'
