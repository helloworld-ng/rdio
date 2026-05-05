# rdio

A single-station radio control repo for scheduling, live operations, metadata, and stream publishing.

The project keeps the product experience in TypeScript and delegates audio delivery to proven radio infrastructure:

- React/Vite for the station UI
- Fastify for the API
- shared TypeScript packages for scheduling logic
- a typed station config package for station details
- Liquidsoap for playout automation
- Icecast for listener streaming

## Repository layout

```text
apps/web          Station UI and scheduling admin
apps/api          HTTP API for station metadata, schedules, and health
apps/worker       Background scheduler and metadata jobs
packages/rdio-core  Shared scheduling and playout logic
packages/db       Database schema and migration home
packages/config   Single-station configuration
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

## Station Config

This repo is currently configured for one station. Edit station details in `packages/config/src/station.ts`:

```ts
export const stationConfig = {
  id: '16rdio',
  name: '16 Radio',
  timezone: 'America/New_York',
  mount: '/rdio.mp3',
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
}
```

The API wraps this config with `defineStation` from `@rdio/rdio-core`. `defineStation` fills in slot `stationId` values, default mounts, UTC timezone, and fallback automation. In local API config, `streamUrl` is derived from `PUBLIC_STREAM_BASE_URL` and the station mount; set `PUBLIC_STREAM_BASE_URL` to the public Icecast origin in production.

## API Shape

The primary API is single-station:

- `GET /station` returns configured station metadata
- `GET /schedule` returns station metadata, all configured programs, current program, upcoming programs, and conflicts
- `GET /now-playing` returns the public stream URL and current playout source

Compatibility routes still exist for older clients:

- `GET /stations`
- `GET /stations/:stationId`
- `GET /stations/:stationId/schedule`
- `GET /stations/:stationId/now-playing`

`GET /schedule` returns:

```json
{
  "station": {
    "id": "16rdio",
    "name": "16 Radio",
    "slug": "16rdio",
    "timezone": "America/New_York",
    "mount": "/rdio.mp3",
    "streamUrl": "https://stream.example.com/rdio.mp3",
    "fallbackSource": { "kind": "playlist", "playlistId": "fallback" }
  },
  "generatedAt": "2026-05-05T12:00:00.000Z",
  "programs": [
    {
      "id": "morning-signal",
      "stationId": "16rdio",
      "title": "Morning Signal",
      "startsAt": "2026-05-03T13:00:00.000Z",
      "endsAt": "2026-05-03T15:00:00.000Z",
      "source": { "kind": "playlist", "playlistId": "fallback" }
    }
  ],
  "currentProgram": null,
  "upcomingPrograms": [],
  "conflicts": []
}
```

External players should use `streamUrl` instead of assembling Icecast host and mount details themselves:

```json
{
  "station": {
    "id": "16rdio",
    "name": "16 Radio",
    "slug": "16rdio",
    "timezone": "America/New_York",
    "mount": "/rdio.mp3",
    "streamUrl": "https://stream.example.com/rdio.mp3",
    "fallbackSource": { "kind": "playlist", "playlistId": "fallback" }
  },
  "mount": "/rdio.mp3",
  "streamUrl": "https://stream.example.com/rdio.mp3",
  "currentProgram": null,
  "upcomingPrograms": [],
  "source": { "kind": "playlist", "playlistId": "fallback" },
  "generatedAt": "2026-05-05T12:00:00.000Z"
}
```
