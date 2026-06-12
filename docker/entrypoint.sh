#!/bin/sh
set -e

npm run db:migrate

exec node dist/pulsegrid/server/server.mjs
