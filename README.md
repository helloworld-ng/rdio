# rdio

An open-source radio station control panel for scheduling, live operations, metadata, and stream publishing.

The project keeps the product experience in TypeScript and delegates audio delivery to proven radio infrastructure:

- React/Vite for the listener and admin UI
- Fastify for the API
- shared TypeScript packages for scheduling logic
- Postgres for station data
- Liquidsoap for playout automation
- Icecast for listener streaming

## Repository layout

```text
apps/web          Listener site and scheduling admin
apps/api          HTTP API for stations, schedules, and health
apps/worker       Background scheduler and metadata jobs
packages/rdio-core  Shared scheduling and playout logic
packages/db       Database schema and migration home
packages/config   Shared TypeScript configuration
services/liquidsoap  rdio playout scripts
services/icecast  Icecast configuration templates
```

## Local development

Install dependencies:

```bash
pnpm install
```

Run the TypeScript apps:

```bash
pnpm dev
```

Run the radio infrastructure:

```bash
docker compose up
```

Default local endpoints:

- Web: http://localhost:5173
- API: http://localhost:3001
- Icecast: http://localhost:8000
- Stream: http://localhost:8000/rdio.mp3

## First product milestone

The first milestone is the scheduling core: model stations, shows, slots, and fallback playlists, then answer `what should be playing now?` reliably.

## Schedule API shape

The API exposes station-first schedule endpoints:

- `GET /stations` lists configured stations
- `GET /stations/:stationId` returns station metadata
- `GET /stations/:stationId/schedule` returns the schedule, current program, upcoming programs, and conflicts
- `GET /stations/:stationId/now-playing` returns the public stream URL and current playout source for one station
- `GET /now-playing` returns the default station for simple players

Stations are defined with `defineStation` from `@rdio/rdio-core`. Add local stations in `apps/api/src/stations.ts`:

```ts
defineStation({
  id: '16rdio',
  name: '16 Radio',
  timezone: 'America/New_York',
  mount: '/rdio.mp3',
  streamUrl: 'https://stream.example.com/rdio.mp3',
  fallbackSource: { kind: 'playlist', playlistId: 'fallback' },
  schedule: [
    {
      id: 'morning-signal',
      title: 'Morning Signal',
      startsAt: '2026-05-03T13:00:00.000Z',
      endsAt: '2026-05-03T15:00:00.000Z',
      source: { kind: 'playlist', playlistId: 'fallback' },
    },
  ],
})
```

`defineStation` fills in slot `stationId` values, default mounts, UTC timezone, and fallback automation, so agents can set up a station from one typed object. In local API config, `streamUrl` is derived from `PUBLIC_STREAM_BASE_URL` and the station mount; set `PUBLIC_STREAM_BASE_URL` to the public Icecast origin in production.

External players should use `streamUrl` instead of assembling Icecast host and mount details themselves:

```json
{
  "stationId": "16rdio",
  "mount": "/rdio.mp3",
  "streamUrl": "https://stream.example.com/rdio.mp3",
  "currentProgram": null,
  "source": { "kind": "playlist", "playlistId": "fallback" }
}
```
