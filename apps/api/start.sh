#!/bin/sh
set -e

ICECAST_SOURCE_PASSWORD="${ICECAST_SOURCE_PASSWORD:-sourcepass}"
ICECAST_PORT="${ICECAST_PORT:-8001}"
HARBOR_PORT="${HARBOR_PORT:-8005}"
HARBOR_TLS_PORT="${HARBOR_TLS_PORT:-8443}"
BROADCAST_HOST="${BROADCAST_HOST:-rdio-api.fly.dev}"
HARBOR_TLS_DIR="/media/harbor-tls"
ICECAST_QUEUE_SIZE="${ICECAST_QUEUE_SIZE:-524288}"
ICECAST_BURST_SIZE="${ICECAST_BURST_SIZE:-65536}"

mkdir -p "$HARBOR_TLS_DIR"
if [ ! -f "$HARBOR_TLS_DIR/tls.crt" ]; then
  openssl req -x509 -newkey rsa:2048 -sha256 -days 3650 -nodes \
    -keyout "$HARBOR_TLS_DIR/tls.key" \
    -out "$HARBOR_TLS_DIR/tls.crt" \
    -subj "/CN=${BROADCAST_HOST}" \
    -addext "subjectAltName=DNS:${BROADCAST_HOST}"
fi
export HARBOR_TLS_CERT="$HARBOR_TLS_DIR/tls.crt"
export HARBOR_TLS_KEY="$HARBOR_TLS_DIR/tls.key"
chmod 644 "$HARBOR_TLS_CERT"
chmod 600 "$HARBOR_TLS_KEY"

# Write icecast config
cat > /etc/icecast2/icecast.xml <<EOF
<icecast>
  <location>Earth</location>
  <admin>admin@localhost</admin>
  <limits>
    <clients>100</clients>
    <sources>10</sources>
    <queue-size>${ICECAST_QUEUE_SIZE}</queue-size>
    <burst-size>${ICECAST_BURST_SIZE}</burst-size>
  </limits>
  <authentication>
    <source-password>${ICECAST_SOURCE_PASSWORD}</source-password>
    <relay-password>${ICECAST_SOURCE_PASSWORD}</relay-password>
    <admin-user>admin</admin-user>
    <admin-password>${ICECAST_SOURCE_PASSWORD}</admin-password>
  </authentication>
  <hostname>localhost</hostname>
  <listen-socket>
    <port>${ICECAST_PORT}</port>
    <bind-address>0.0.0.0</bind-address>
  </listen-socket>
  <paths>
    <basedir>/usr/share/icecast2</basedir>
    <logdir>/tmp</logdir>
    <webroot>/usr/share/icecast2/web</webroot>
    <adminroot>/usr/share/icecast2/admin</adminroot>
  </paths>
  <logging>
    <loglevel>3</loglevel>
    <logsize>10000</logsize>
  </logging>
  <security>
    <chroot>0</chroot>
    <changeowner>
      <user>nobody</user>
      <group>nogroup</group>
    </changeowner>
  </security>
</icecast>
EOF

icecast2 -c /etc/icecast2/icecast.xml &
mkdir -p /media/schedule /media/uploads /media/fallback /media/cache
# Keep API cache writes on the same volume Liquidsoap reads.
export MEDIA_CACHE_DIR="/media/cache"
if [ ! -f /media/schedule/playout-state.tsv ]; then
  printf '0\tfallback\t/media/fallback/v1-tone.mp3\n' > /media/schedule/playout-state.tsv
fi
if [ ! -f /media/schedule/current.txt ]; then
  printf '%s\n' "/media/fallback/v1-tone.mp3" > /media/schedule/current.txt
fi
liquidsoap /rdio/station.liq &
harbor_ready=0
for _ in $(seq 1 30); do
  if nc -z 127.0.0.1 "$HARBOR_PORT" 2>/dev/null; then
    harbor_ready=1
    break
  fi
  sleep 1
done
if [ "$harbor_ready" -ne 1 ]; then
  echo "liquidsoap harbor did not start on port ${HARBOR_PORT}" >&2
  exit 1
fi
# TLS on 8443 for broadcasters outside the UK / restrictive networks.
# Plain harbor stays on 8005 locally; socat terminates SSL and forwards inward.
socat "openssl-listen:${HARBOR_TLS_PORT},bind=0.0.0.0,reuseaddr,cert=${HARBOR_TLS_CERT},key=${HARBOR_TLS_KEY},verify=0,fork" "tcp:127.0.0.1:${HARBOR_PORT}" &
exec node /app/dist/server.js
