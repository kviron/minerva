#!/bin/sh
set -eu
. /opt/minerva/lib.sh

configure_restic
require_safe_release_identity
if ! restic cat config >/dev/null 2>&1; then
  echo 'Backup repository is unavailable' >&2
  exit 1
fi

: "${PRODUCTION_S3_ENDPOINT:?Production object storage configuration is unavailable}"
: "${PRODUCTION_S3_BUCKET:?Production object storage configuration is unavailable}"
export AWS_ACCESS_KEY_ID="$(read_secret object_audit_access_key_id "${OBJECT_AUDIT_ACCESS_KEY_ID_FILE:-/run/secrets/object_audit_access_key_id}")"
export AWS_SECRET_ACCESS_KEY="$(read_secret object_audit_secret_access_key "${OBJECT_AUDIT_SECRET_ACCESS_KEY_FILE:-/run/secrets/object_audit_secret_access_key}")"
versioning="$(aws --endpoint-url "$PRODUCTION_S3_ENDPOINT" s3api get-bucket-versioning --bucket "$PRODUCTION_S3_BUCKET" --output json)"
if [ "$(printf '%s' "$versioning" | jq -r '.Status // ""')" != 'Enabled' ]; then
  echo 'Production object versioning is unavailable' >&2
  exit 1
fi

available_kib="$(df -Pk /backup-stage | awk 'NR == 2 { print $4 }')"
minimum_kib="${BACKUP_MIN_FREE_KIB:-1048576}"
if [ "$available_kib" -lt "$minimum_kib" ]; then
  echo 'Backup staging capacity is unavailable' >&2
  exit 1
fi
echo '{"status":"ok"}'
