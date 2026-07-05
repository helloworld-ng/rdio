set("log.stdout", true)
set("log.file", false)
settings.init.allow_root.set(true)

fallback_file = "/media/fallback/v1-tone.mp3"
# Loop the fallback tone — single() plays once then stalls, causing dropouts.
def fallback_request() =
  request.create(fallback_file)
end

default =
  if file.exists(fallback_file) then
    request.dynamic(
      id = "fallback",
      retry_delay = 0.5,
      fallback_request
    )
  else
    blank()
  end
icecast_host     = environment.get("ICECAST_HOST",            default="localhost")
icecast_port     = int_of_string(environment.get("ICECAST_PORT",     default="8001"))
icecast_password = environment.get("ICECAST_SOURCE_PASSWORD", default="sourcepass")
harbor_port      = int_of_string(environment.get("HARBOR_PORT",      default="8005"))
live_status_file = "/media/schedule/broadcast-status.txt"
playout_state_file = "/media/schedule/playout-state.tsv"

settings.harbor.bind_addrs.set(["0.0.0.0"])

def mark_live_connected(_) =
  process.run("sh -lc 'printf connected > #{live_status_file}'")
end

def mark_live_disconnected() =
  process.run("sh -lc 'printf disconnected > #{live_status_file}'")
end

# Live broadcast source — BUTT connects to plain harbor (8005) or TLS via socat (8443).
live = input.harbor(
  buffer = 3.0,
  max = 12.0,
  on_connect = mark_live_connected,
  on_disconnect = mark_live_disconnected,
  password = icecast_password,
  port = harbor_port,
  user = "source",
  "/broadcast.mp3"
)

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

# When the live encoder hiccups, hold the fallback tone instead of silence.
live_or_fallback = fallback(track_sensitive = false, [live, default])

rdio = switch(track_sensitive=false, [
  ({is_broadcast_mode()}, live_or_fallback),
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

def refresh_playout(prev_mode) =
  state = read_playout_state()

  if state.mode == "recording" or prev_mode == "recording" then
    recorded.skip()
  end

  # Never skip the live graph during a stable broadcast — that drops Icecast.
  if not (state.mode == "broadcast" and prev_mode == "broadcast") then
    rdio.skip()
  end
end

def on_playout_change() =
  state = read_playout_state()
  prev_mode = last_mode()
  leaving_recording = prev_mode == "recording" and state.mode != "recording"
  mode_changed = prev_mode != state.mode
  revision_changed = state.revision != last_revision()
  target_changed = state.target != last_target()

  if revision_changed or mode_changed or target_changed then
    log_playout(
      "rev=#{state.revision} mode=#{state.mode} target=#{state.target} leaving_recording=#{leaving_recording} prev_rev=#{last_revision()} prev_mode=#{prev_mode}"
    )
    last_revision := state.revision
    last_mode := state.mode
    last_target := state.target
    # skip() must run on the main clock thread.
    thread.run(delay=0., fun () -> refresh_playout(prev_mode))
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
