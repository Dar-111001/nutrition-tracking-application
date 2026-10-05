#!/bin/sh
# Container health check (Docker HEALTHCHECK, or the ECS container health check command).
. /usr/local/lib/healthcheck-env.sh
wget -q -O /dev/null "http://127.0.0.1:${HEALTHCHECK_PORT}${HEALTHCHECK_PATH}" || exit 1
