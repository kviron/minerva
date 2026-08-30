#!/bin/sh
set -eu

read_secret() {
  key="$1"
  path="$2"
  if [ ! -f "$path" ] || [ ! -r "$path" ]; then
    echo "Required backup configuration is unavailable: $key" >&2
    exit 1
  fi
  value="$(cat "$path")"
  if [ -z "$value" ]; then
    echo "Required backup configuration is unavailable: $key" >&2
    exit 1
  fi
  printf '%s' "$value"
}

configure_restic() {
  export RESTIC_CACHE_DIR="${RESTIC_CACHE_DIR:-/tmp/restic-cache}"
  export RESTIC_REPOSITORY="$(read_secret backup_repository "${BACKUP_REPOSITORY_FILE:-/run/secrets/backup_repository}")"
  export RESTIC_PASSWORD_FILE="${RESTIC_PASSWORD_FILE:-/run/secrets/restic_password}"
  read_secret restic_password "$RESTIC_PASSWORD_FILE" >/dev/null

  if [ -f "${BACKUP_ACCESS_KEY_ID_FILE:-/run/secrets/backup_access_key_id}" ]; then
    export AWS_ACCESS_KEY_ID="$(read_secret backup_access_key_id "${BACKUP_ACCESS_KEY_ID_FILE:-/run/secrets/backup_access_key_id}")"
    export AWS_SECRET_ACCESS_KEY="$(read_secret backup_secret_access_key "${BACKUP_SECRET_ACCESS_KEY_FILE:-/run/secrets/backup_secret_access_key}")"
  fi
}

require_safe_release_identity() {
  if ! printf '%s' "${APP_IMAGE_DIGEST:-}" | grep -Eq '^sha256:[0-9a-f]{64}$'; then
    echo 'Backup release identity is invalid' >&2
    exit 1
  fi
  case "${REQUIRED_MIGRATION_CREATED_AT:-}" in
    ''|*[!0-9]*) echo 'Backup migration identity is invalid' >&2; exit 1 ;;
  esac
}
