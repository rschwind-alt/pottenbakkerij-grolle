#!/bin/sh
set -e

POSTGRES_HOST=${POSTGRES_HOST:-db}
POSTGRES_PORT=${POSTGRES_PORT:-5432}

if [ "${DATABASE_WAIT_FOR_DB:-1}" = "1" ]; then
  echo "Waiting for PostgreSQL at ${POSTGRES_HOST}:${POSTGRES_PORT}..."
  while ! nc -z "${POSTGRES_HOST}" "${POSTGRES_PORT}"; do
    sleep 1
  done
fi

python manage.py migrate --noinput
python manage.py collectstatic --noinput

# Seed media files from image into the media volume if not already present.
if [ -d /app/media_seed ]; then
  find /app/media_seed -type f | while read src; do
    rel="${src#/app/media_seed/}"
    dest="/app/media/${rel}"
    if [ ! -f "$dest" ]; then
      mkdir -p "$(dirname "$dest")"
      cp "$src" "$dest"
      echo "Seeded media: $dest"
    fi
  done
fi

exec "$@"
