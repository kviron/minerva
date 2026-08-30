#!/bin/sh
set -eu
. /opt/minerva/lib.sh

stage="$(mktemp -d /restore-stage/minerva-restore.XXXXXX)"
trap 'rm -rf "$stage"' EXIT HUP INT TERM

configure_restic
snapshot_id="${RESTORE_SNAPSHOT_ID:?Restore snapshot is required}"
case "$snapshot_id" in *[!A-Za-z0-9]*) echo 'Restore snapshot identity is invalid' >&2; exit 1 ;; esac
if [ "$snapshot_id" = 'latest' ]; then
  echo 'Restore requires an explicit snapshot identity' >&2
  exit 1
fi
database_url="$(read_secret restore_database_url "${RESTORE_DATABASE_URL_FILE:-/run/secrets/restore_database_url}")"

if ! restic restore "$snapshot_id" --target "$stage" --include /minerva-backup.tar >/dev/null 2>&1; then
  echo 'Restore snapshot is unavailable' >&2
  exit 1
fi
archive="$stage/minerva-backup.tar"
if [ ! -f "$archive" ]; then
  echo 'Restore snapshot is incomplete' >&2
  exit 1
fi
tar -C "$stage" -xf "$archive"
rm -f "$archive"
manifest="$stage/manifest.json"
dump="$stage/minerva.dump"
if [ ! -f "$manifest" ] || [ ! -f "$dump" ]; then
  echo 'Restore snapshot is incomplete' >&2
  exit 1
fi
expected="$(jq -er '
  select(
    (keys | sort) == (["appImageDigest","createdAt","dumpFilename","dumpSha256","formatVersion","migrationCreatedAt"] | sort)
    and .formatVersion == 1
    and (.createdAt | test("^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.000Z$"))
    and (.migrationCreatedAt | type == "number")
    and (.appImageDigest | test("^sha256:[0-9a-f]{64}$"))
    and .dumpFilename == "minerva.dump"
  )
  | .dumpSha256
  | select(test("^[0-9a-f]{64}$"))
' "$manifest")"
(
  cd "$stage"
  printf '%s  %s\n' "$expected" minerva.dump | sha256sum -c -
)

psql "$database_url" -v ON_ERROR_STOP=1 -c 'drop schema if exists public cascade; create schema public;'
pg_restore --exit-on-error --no-owner --no-privileges --dbname="$database_url" "$dump"
/opt/minerva/verify-database.sh >/dev/null
/opt/minerva/verify-key-versions.sh >/dev/null
/opt/minerva/verify-object-inventory.sh >/dev/null
echo '{"status":"ok"}'
