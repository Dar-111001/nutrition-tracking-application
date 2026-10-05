#!/bin/sh
# Resolves the health check settings from env vars. Sourced (not executed) by
# both the startup script and the container health check, so they always agree.
#
#   HEALTHCHECK_URL   optional, e.g. http://localhost:8081/healthz  (sets port and path)
#   HEALTHCHECK_PORT  default: $PORT (the app port)
#   HEALTHCHECK_PATH  default: /health

if [ -n "$HEALTHCHECK_URL" ]; then
  _hc_rest="${HEALTHCHECK_URL#*://}"      # localhost:8081/healthz
  _hc_hostport="${_hc_rest%%/*}"           # localhost:8081
  case "$_hc_rest" in
    */*) HEALTHCHECK_PATH="/${_hc_rest#*/}" ;;
    *)   HEALTHCHECK_PATH="/" ;;
  esac
  case "$_hc_hostport" in
    *:*) HEALTHCHECK_PORT="${_hc_hostport##*:}" ;;
  esac
fi

: "${PORT:=80}"
: "${HEALTHCHECK_PORT:=$PORT}"
: "${HEALTHCHECK_PATH:=/health}"
export PORT HEALTHCHECK_PORT HEALTHCHECK_PATH
