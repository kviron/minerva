#!/bin/sh
set -eu
. /opt/minerva/lib.sh

configure_restic
maximum_age_seconds="${BACKUP_MAX_AGE_SECONDS:-86400}"
case "$maximum_age_seconds" in ''|*[!0-9]*) echo '{"status":"invalid"}'; exit 1 ;; esac

if ! snapshots="$(restic snapshots --host minerva-production --tag minerva-db --latest 1 --json 2>/dev/null)"; then
  echo '{"status":"unavailable"}'
  exit 1
fi
latest="$(printf '%s' "$snapshots" | jq -r 'if length == 0 then "" else max_by(.time).time end')"
if [ -z "$latest" ]; then
  echo '{"status":"missing"}'
  exit 1
fi

snapshot_epoch="$(printf '%s' "$latest" | jq -Rer 'sub("\\.[0-9]+Z$"; "Z") | fromdateiso8601' 2>/dev/null || true)"
now_epoch="$(date -u +%s)"
case "$snapshot_epoch" in ''|*[!0-9]*) echo '{"status":"invalid"}'; exit 1 ;; esac
age_seconds=$((now_epoch - snapshot_epoch))
if [ "$age_seconds" -lt 0 ]; then
  echo '{"status":"invalid"}'
  exit 1
fi
if [ "$age_seconds" -gt "$maximum_age_seconds" ]; then
  printf '{"status":"stale","ageSeconds":%s}\n' "$age_seconds"
  exit 1
fi
printf '{"status":"fresh","ageSeconds":%s}\n' "$age_seconds"
