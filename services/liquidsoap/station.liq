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
playout_state_file = "/media/schedule/playout-state.tsv"

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

# TLS harbor is only enabled when cert files exist (generated on Fly at boot).
def mk_live() =
  if file.exists(harbor_tls_cert) and file.exists(harbor_tls_key) then
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

    fallback(track_sensitive = false, [live_tls, live_plain])
  else
    live_plain
  end
end

live = mk_live()

def read_playout_state() =
  if file.exists(playout_state_file) then
    parts = string.split(separator="\t", string.trim(file.contents(playout_state_file)))
    revision =
      if list.length(parts) > 0 then
        int_of_string(default=0, list.nth(parts, 0))
      else
        0
      end
    mode =
      if list.length(parts) > 1 then
        list.nth(parts, 1)
      else
        "fallback"
      end
    target =
      if list.length(parts) > 2 then
        list.nth(parts, 2)
      else
        fallback_file
      end
    { revision = revision, mode = mode, target = target }
  else
    { revision = 0, mode = "fallback", target = fallback_file }
  end
end

def read_playout_target() =
  state = read_playout_state()

  if state.mode == "broadcast" or state.target == "" or state.target == "broadcast" then
    fallback_file
  else
    state.target
  end
end

def playout_mode() =
  read_playout_state().mode
end

def is_broadcast_mode() =
  playout_mode() == "broadcast"
end

def is_recording_mode() =
  playout_mode() == "recording"
end

def get_scheduled_request() =
  request.create(resolve_metadata=false, read_playout_target())
end

scheduled = request.dynamic(
  id = "rdio-schedule",
  retry_delay = 0.5,
  get_scheduled_request
)

# Only wire request.dynamic while mode=recording. The old fallback([scheduled,
# default]) kept scheduled in the graph after delete wrote mode=fallback, so
# skip() could not reliably stop the cached file.
recorded = switch(track_sensitive=false, [
  ({is_recording_mode()}, scheduled),
  ({true}, default)
])

live_or_silence = fallback(track_sensitive = false, [live, blank()])

rdio = switch(track_sensitive=false, [
  ({is_broadcast_mode()}, live_or_silence),
  ({true}, recorded)
])
rdio = mksafe(rdio)

state = read_playout_state()
last_revision = ref(state.revision)
last_mode = ref(state.mode)
last_target = ref(state.target)

def log_playout(message) =
  log(level=3, label="playout", message)
end

def refresh_playout() =
  recorded.skip()
  rdio.skip()
end

def on_playout_change() =
  state = read_playout_state()
  leaving_recording = last_mode() == "recording" and state.mode != "recording"
  mode_changed = last_mode() != state.mode
  revision_changed = state.revision != last_revision()
  target_changed = state.target != last_target()

  if revision_changed or mode_changed or target_changed then
    log_playout(
      "rev=#{state.revision} mode=#{state.mode} target=#{state.target} leaving_recording=#{leaving_recording} prev_rev=#{last_revision()} prev_mode=#{last_mode()}"
    )
    last_revision := state.revision
    last_mode := state.mode
    last_target := state.target
    # skip() must run on the main clock thread.
    thread.run(delay=0., refresh_playout)
  end
end

on_playout_change()
file.watch(playout_state_file, on_playout_change)
thread.run(every=0.5, on_playout_change)

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
