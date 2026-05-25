#!/bin/sh
set -e
liquidsoap /rdio/station.liq &
exec node /app/dist/server.js
