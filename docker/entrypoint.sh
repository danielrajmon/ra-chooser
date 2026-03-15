#!/bin/sh
set -eu

required_vars="POSTGRES_HOST POSTGRES_PORT POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD"

for var_name in $required_vars; do
  eval "var_value=\${$var_name:-}"
  if [ -z "$var_value" ] || [ "$var_value" = "__REQUIRED__" ]; then
    echo "$var_name is required" >&2
    exit 1
  fi
done

case "${POSTGRES_HOST}" in
  localhost|127.0.0.1|::1)
    echo "POSTGRES_HOST=${POSTGRES_HOST} points to the app container itself inside Docker; use your NAS DB host instead" >&2
    ;;
esac

exec "$@"
