#!/bin/sh
set -eu
. /opt/minerva/lib.sh

if [ "${INITIALIZE_REPOSITORY:-}" != 'yes' ]; then
  echo 'Repository initialization requires explicit confirmation' >&2
  exit 1
fi
configure_restic
if ! restic init >/dev/null 2>&1; then
  echo 'Backup repository initialization failed' >&2
  exit 1
fi
echo '{"status":"ok"}'
