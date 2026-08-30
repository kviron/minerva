#!/bin/sh
set -eu
. /opt/minerva/lib.sh

database_url="$(read_secret restore_database_url "${RESTORE_DATABASE_URL_FILE:-/run/secrets/restore_database_url}")"
export AWS_ACCESS_KEY_ID="$(read_secret restore_s3_access_key_id "${RESTORE_S3_ACCESS_KEY_ID_FILE:-/run/secrets/restore_s3_access_key_id}")"
export AWS_SECRET_ACCESS_KEY="$(read_secret restore_s3_secret_access_key "${RESTORE_S3_SECRET_ACCESS_KEY_FILE:-/run/secrets/restore_s3_secret_access_key}")"
: "${RESTORE_S3_ENDPOINT:?Restore object storage configuration is unavailable}"
: "${RESTORE_S3_BUCKET:?Restore object storage configuration is unavailable}"

object_keys="$(psql "$database_url" -Atqc '
  select object_key from document_images
  union select object_key from project_icons
  order by 1
')"

missing=0
while IFS= read -r object_key; do
  [ -z "$object_key" ] && continue
  if ! aws --endpoint-url "$RESTORE_S3_ENDPOINT" s3api head-object --bucket "$RESTORE_S3_BUCKET" --key "$object_key" >/dev/null 2>&1; then
    missing=$((missing + 1))
  fi
done <<EOF
$object_keys
EOF

if [ "$missing" -ne 0 ]; then
  echo 'Restore object inventory is incomplete' >&2
  exit 1
fi
echo '{"status":"ok"}'
