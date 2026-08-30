#!/bin/sh
set -eu
. /opt/minerva/lib.sh

configure_restic
if ! restic check >/dev/null 2>&1; then
  echo '{"status":"unavailable"}'
  exit 1
fi
/opt/minerva/freshness.sh
