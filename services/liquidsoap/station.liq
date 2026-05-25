set("log.stdout", true)
set("log.file", false)
settings.init.allow_root.set(true)

fallback_file = "/media/fallback/v1-tone.mp3"
default = if file.exists(fallback_file) then single(fallback_file) else blank() end
icecast_host     = environment.get("ICECAST_HOST",            default="localhost")
icecast_port     = int_of_string(environment.get("ICECAST_PORT",     default="8001"))
icecast_password = environment.get("ICECAST_SOURCE_PASSWORD", default="sourcepass")

def get_scheduled_request() =
  lines = process.read.lines("cat /media/schedule/current.txt")

  if lines == [] then
    request.create(resolve_metadata = false, fallback_file)
  else
    scheduled_file = string.trim(list.hd(lines))

    if scheduled_file == "" then
      request.create(resolve_metadata = false, fallback_file)
    else
      request.create(resolve_metadata = false, scheduled_file)
    end
  end
end

scheduled = request.dynamic(
  id = "rdio-schedule",
  retry_delay = 2.0,
  get_scheduled_request
)

rdio = mksafe(fallback(track_sensitive = false, [scheduled, default]))

output.icecast(
  %mp3(bitrate = 192),
  host = icecast_host,
  port = icecast_port,
  password = icecast_password,
  mount = "/rdio.mp3",
  name = "rdio",
  description = "Open-source rdio automation",
  rdio
)
