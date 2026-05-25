# rdio

A single-station internet radio control suite: schedule editor, media library, live broadcast console, and stream automation.

The project keeps the product layer in TypeScript and delegates audio delivery to proven radio infrastructure:

- React 19 + Vite for the station admin SPA
- Fastify 5 for the HTTP API
- Shared TypeScript packages for scheduling logic and station config
- Liquidsoap for playout automation
- Icecast for listener streaming

## Repository layout

```text
apps/web           Station admin SPA (schedule, programs, hosts, media, broadcast)
apps/api           HTTP API (station metadata, schedule blocks, media files, playout)
apps/worker        Background scheduler stub (not yet implemented)
packages/rdio-core Shared scheduling and playout types and logic
packages/config    Single-station configuration
packages/db        Database schema placeholder (not yet implemented)
services/liquidsoap  Liquidsoap playout script
services/icecast   Icecast configuration templates
```

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for Icecast and Liquidsoap)

## Local development

Copy the example env file and adjust as needed:

```bash
cp .env.example .env
```

Install dependencies:

```bash
pnpm install
```

Start the TypeScript apps (web + API in watch mode):

```bash
pnpm dev
```

Start the radio infrastructure (Icecast + Liquidsoap + Postgres):

```bash
docker compose up
```

Default local endpoints:

| Service | URL |
|---------|-----|
| Web admin | http://localhost:5173 |
| API | http://localhost:3001 |
| Icecast admin | http://localhost:8000/admin |
| Stream | http://localhost:8000/rdio.mp3 |

## Environment variables

All variables have defaults that work for local development.

| Variable | Default | Description |
|----------|---------|-------------|
| `API_PORT` | `3001` | Port the Fastify API listens on |
| `WEB_PORT` | `5173` | Port the Vite dev server listens on |
| `PUBLIC_STREAM_BASE_URL` | `http://localhost:8000` | Public Icecast origin — used to build `streamUrl` in API responses. Set to your Icecast host in production (e.g. `https://stream.example.com`) |
| `VITE_API_BASE_URL` | `http://localhost:3001` | API base URL read by the web app at build time. Set to your API origin for production builds |
| `ICECAST_SOURCE_PASSWORD` | `sourcepass` | Icecast source (broadcast) password |
| `ICECAST_ADMIN_PASSWORD` | `adminpass` | Icecast admin password |
| `DATABASE_URL` | `postgres://rdio:rdio@localhost:5432/rdio` | Postgres connection string (unused until `packages/db` is implemented) |

## Production build

Build all packages and apps:

```bash
pnpm build
```

Start the API:

```bash
node apps/api/dist/server.js
```

Serve the web app from `apps/web/dist/` with any static file host (Nginx, Caddy, etc.). The web app is a plain SPA — configure your server to serve `index.html` for all routes.

Set `VITE_API_BASE_URL` before building to point the web app at your production API:

```bash
VITE_API_BASE_URL=https://api.example.com pnpm build
```

## Media storage

The API stores uploaded media files at `media/uploads/` (relative to the repo root). The current playout pointer is written to `media/schedule/current.txt`. Both directories are created automatically on first use. The Liquidsoap container mounts `./media` at `/media` read-only.

For production, mount a persistent volume at `media/` or adjust the `uploadDirectory` and `scheduleDirectory` paths in `apps/api/src/server.ts`.

## Station config

Station details live in `packages/config/src/station.ts`:

```ts
export const stationConfig: RadioStationInput = {
  id: '16rdio',
  name: '16 Radio',
  timezone: 'America/New_York',
  mount: '/rdio.mp3',
  fallbackSource: { kind: 'playlist', playlistId: 'fallback' },
  schedule: [],
}
```

The API wraps this with `defineStation` from `@rdio/rdio-core`, which fills in a `slug`, default `mount`, UTC timezone fallback, and `streamUrl` derived from `PUBLIC_STREAM_BASE_URL`.

## What's persisted vs. mock

| Data | Persisted? | Storage |
|------|-----------|---------|
| Schedule blocks | Yes | `media/schedule/blocks.json` |
| Media files | Yes | `media/uploads/` |
| Current playout pointer | Yes | `media/schedule/current.txt` |
| Programs | No — mock data | In-memory (React state, seeded from `mockStation.ts`) |
| Hosts | No — mock data | In-memory (React state, seeded from `mockStation.ts`) |
| Station config | Yes — static | `packages/config/src/station.ts` |

Programs and hosts are seeded from mock data in `apps/web/src/data/mockStation.ts` and reset on page reload. Full persistence for these is a planned milestone.

## API endpoints

```
GET  /health               Service health check
GET  /station              Station metadata
GET  /schedule             Station schedule snapshot (programs from station config)
GET  /schedule-blocks      Admin schedule blocks (drag-drop calendar data)
PUT  /schedule-blocks      Replace schedule blocks; triggers playout refresh
GET  /now-playing          Current stream source and upcoming programs
GET  /playout/current      Current Liquidsoap playout file path
GET  /media                List uploaded media files
POST /media                Upload a media file (binary body, X-File-Name header)
GET  /media/:id            Serve a media file
DELETE /media/:id          Delete a media file; triggers playout refresh
```

`GET /schedule` example response:

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
  "generatedAt": "2026-05-25T12:00:00.000Z",
  "programs": [],
  "currentProgram": null,
  "upcomingPrograms": [],
  "conflicts": []
}
```

External players should use `streamUrl` from either `/station` or `/now-playing` rather than assembling the Icecast host and mount themselves.

## Liquidsoap playout

Liquidsoap reads `current.txt` via a `request.dynamic` source. The API refreshes this file on every schedule block save, media delete, and on a 15-second polling interval. If no scheduled media is active, the fallback file (`/media/fallback/v1-tone.mp3`) is used — place a fallback audio file there before starting Liquidsoap.

## Live broadcast (BUTT)

The Broadcast view in the admin shows connection settings for BUTT (Broadcast Using This Tool). Connect BUTT to Icecast on port 8000 using the source password from your `.env` (`ICECAST_SOURCE_PASSWORD`). The mount is taken from the station config (`/rdio.mp3` by default).
