#!/bin/sh
set -e

ICECAST_SOURCE_PASSWORD="${ICECAST_SOURCE_PASSWORD:-sourcepass}"

# Write icecast config
cat > /etc/icecast2/icecast.xml <<EOF
<icecast>
  <location>Earth</location>
  <admin>admin@localhost</admin>
  <limits>
    <clients>100</clients>
    <sources>10</sources>
  </limits>
  <authentication>
    <source-password>${ICECAST_SOURCE_PASSWORD}</source-password>
    <relay-password>${ICECAST_SOURCE_PASSWORD}</relay-password>
    <admin-user>admin</admin-user>
    <admin-password>${ICECAST_SOURCE_PASSWORD}</admin-password>
  </authentication>
  <hostname>localhost</hostname>
  <listen-socket>
    <port>8001</port>
    <bind-address>127.0.0.1</bind-address>
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
liquidsoap /rdio/station.liq &
exec node /app/dist/server.js
