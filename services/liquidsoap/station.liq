set("log.stdout", true)
set("log.file", false)
settings.init.allow_root.set(true)

fallback_file = "/media/fallback/v1-tone.mp3"
default = if file.exists(fallback_file) then single(fallback_file) else blank() end
icecast_host     = environment.get("ICECAST_HOST",            default="localhost")
icecast_port     = int_of_string(environment.get("ICECAST_PORT",     default="8001"))
icecast_password = environment.get("ICECAST_SOURCE_PASSWORD", default="sourcepass")
harbor_port      = int_of_string(environment.get("HARBOR_PORT",      default="8005"))
harbor_tls_port  = int_of_string(environment.get("HARBOR_TLS_PORT", default="8443"))
harbor_tls_cert  = environment.get("HARBOR_TLS_CERT", default="/media/harbor-tls/tls.crt")
harbor_tls_key   = environment.get("HARBOR_TLS_KEY",  default="/media/harbor-tls/tls.key")
live_status_file = "/media/schedule/broadcast-status.txt"
broadcast_active_file = "/media/schedule/broadcast-active"

def mark_live_connected(_) =
  process.run("sh -lc 'printf connected > #{live_status_file}'")
end

def mark_live_disconnected() =
  process.run("sh -lc 'printf disconnected > #{live_status_file}'")
end

# Live broadcast source — BUTT connects directly to Liquidsoap.
live_plain = input.harbor(
  buffer = 1.0,
  max = 3.0,
  on_connect = mark_live_connected,
  on_disconnect = mark_live_disconnected,
  password = icecast_password,
  port = harbor_port,
  user = "source",
  "/broadcast.mp3"
)

# TLS harbor for networks that block plain Icecast on port 8005.
harbor_tls_transport = http.transport.ssl(
  certificate = harbor_tls_cert,
  key = harbor_tls_key
)

live_tls = input.harbor(
  buffer = 1.0,
  max = 3.0,
  on_connect = mark_live_connected,
  on_disconnect = mark_live_disconnected,
  password = icecast_password,
  port = harbor_tls_port,
  transport = harbor_tls_transport,
  user = "source",
  "/broadcast.mp3"
)

live = fallback(track_sensitive = false, [live_tls, live_plain])

def get_scheduled_request() =
  lines = process.read.lines("cat /media/schedule/current.txt 2>/dev/null")

  if lines == [] then
    request.create(resolve_metadata = false, fallback_file)
  else
    scheduled_file = string.trim(list.hd(lines))

    if scheduled_file == "" or scheduled_file == "broadcast" then
      request.create(resolve_metadata = false, fallback_file)
    else
      request.create(resolve_metadata = false, scheduled_file)
    end
  end
end

def is_broadcast() =
  file.exists(broadcast_active_file)
end

scheduled = request.dynamic(
  id = "rdio-schedule",
  retry_delay = 2.0,
  get_scheduled_request
)

recorded = fallback(track_sensitive = false, [scheduled, default])
live_or_silence = fallback(track_sensitive = false, [live, blank()])

rdio = switch(track_sensitive = false, [
  ({is_broadcast()}, live_or_silence),
  ({true}, recorded)
])
rdio = mksafe(rdio)

output.icecast(
  %mp3(bitrate = 192),
  host = icecast_host,
  port = icecast_port,
  password = icecast_password,
  mount = "/live.mp3",
  name = "rdio",
  description = "Open-source rdio automation",
  rdio
)
