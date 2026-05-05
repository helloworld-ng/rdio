set("log.stdout", true)
set("log.file", false)

default = playlist.safe("/media/fallback")
rdio = mksafe(default)

output.icecast(
  %mp3(bitrate = 192),
  host = "icecast",
  port = 8000,
  password = "sourcepass",
  mount = "rdio.mp3",
  name = "rdio",
  description = "Open-source rdio automation",
  rdio
)
