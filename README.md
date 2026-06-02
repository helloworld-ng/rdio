# rdio

A single-station internet radio control suite: schedule editor, media library, live broadcast console, and stream automation.

The project keeps the product layer in TypeScript and delegates audio delivery to proven radio infrastructure:

- React 19 + Vite for the station admin SPA
- Fastify 5 for the HTTP API
- Shared TypeScript packages for scheduling logic and station config
- Liquidsoap for playout automation
- Icecast2 for listener streaming

## Deployment model

The API container can bundle Node.js, Icecast2, and Liquidsoap in a single machine. In that setup, the services communicate over `localhost`, and the Node.js API proxies the audio stream from the internal Icecast port at `GET /live.mp3`.

## Repository layout

```text
apps/web              Station admin SPA (schedule, programs, hosts, media, broadcast)
apps/api              HTTP API + bundled Icecast2 + Liquidsoap (production container)
packages/rdio-core    Shared scheduling and playout types and logic
packages/config       Single-station configuration
services/liquidsoap   Liquidsoap playout script
services/icecast      Icecast config templates (used for local Docker dev)
```

## Prerequisites

- Node.js 22+
- pnpm 9+
- Docker (for local Icecast and Liquidsoap)

## Local development

Copy the app env files and adjust as needed:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Install dependencies:

```bash
pnpm install
```

Start the TypeScript apps (web + API in watch mode):

```bash
pnpm dev
```

To run an app independently:

```bash
pnpm api:dev
pnpm web:dev
pnpm worker:dev
```

Start the radio infrastructure (Icecast + Liquidsoap):

```bash
cp .env.example .env
docker compose up
```

The first run downloads the Icecast and Liquidsoap container images. To confirm that the local stream is available, open http://localhost:8000/live.mp3.

Default local endpoints:

| Service | URL |
|---------|-----|
| Web admin | http://localhost:5173 |
| API | http://localhost:3001 |
| Icecast admin | http://localhost:8000/admin |
| Stream | http://localhost:3001/live.mp3 |

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `API_PORT` | `3001` | Port the Fastify API listens on |
| `API_KEY` | _(blank)_ | Shared secret for write endpoints. Leave blank to disable auth |
| `WEB_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |
| `VITE_API_BASE_URL` | `http://localhost:3001` | API base URL baked into the web build at build time |
| `VITE_API_KEY` | _(blank)_ | Must match `API_KEY`. Baked into the web build at build time |
| `PUBLIC_STREAM_BASE_URL` | _(request origin)_ | Optional public stream origin used to build `streamUrl` in API responses. Leave blank to use the API's `/live.mp3` proxy |
| `ICECAST_HOST` | `localhost` | Icecast host (Liquidsoap connects here) |
| `ICECAST_PORT` | `8001` in the bundled API container, `8000` for local Docker Compose Icecast | Icecast port |
| `HARBOR_PORT` | `8005` | Liquidsoap Harbor port for BUTT live broadcast source connections |
| `ICECAST_SOURCE_PASSWORD` | `sourcepass` | Icecast source password |

In a bundled production container, `ICECAST_HOST=localhost` and `ICECAST_PORT=8001` since Icecast runs inside the same container. `API_KEY` and `VITE_API_KEY` should be set to the same strong secret. Set `PUBLIC_STREAM_BASE_URL` only when browsers should play from a separate public Icecast origin instead of the API proxy.

## Deployment

### API (with Icecast2 + Liquidsoap bundled)

Deploy from the repo root so the Dockerfile context includes the whole workspace:

```bash
docker build -f apps/api/Dockerfile -t <api-image-name> .
```

Set required secrets:

| Secret | Description |
|--------|-------------|
| `API_KEY` | Shared secret for authenticated API endpoints |
| `ICECAST_SOURCE_PASSWORD` | Password Liquidsoap uses to publish to Icecast |

Mount persistent storage at `/media`, then add a fallback audio file so Liquidsoap has something to play when nothing is scheduled:

```bash
mkdir -p /media/fallback
cp /path/to/fallback.mp3 /media/fallback/v1-tone.mp3
```

### Web

The web app can be deployed by building `apps/web` with the API URL and shared API key available at build time. If using GitHub Actions, set these repository secrets:

| Secret | Value |
|--------|-------|
| `VITE_API_BASE_URL` | Public API origin |
| `VITE_API_KEY` | Same value as the API's `API_KEY` secret |

Build manually from the repo root:

```bash
pnpm --filter @rdio/web build
```

## Media and data storage

All persistent data lives at `/media` in production (or `media/` relative to the repo root locally).

| Data | Storage |
|------|---------|
| Schedule blocks | `media/schedule/YYYY-MM-DD.json` — one file per day |
| Current playout pointer | `media/schedule/current.txt` |
| Programs | `media/programs.json` |
| Hosts | `media/hosts.json` |
| Uploaded media files | `media/uploads/` |
| Fallback audio | `media/fallback/v1-tone.mp3` |
| Station config | `packages/config/src/station.ts` (static) |

Schedule blocks are stored as daily JSON files. If a legacy `blocks.json` is present at startup it is automatically migrated to daily files and removed.

## API endpoints

### Public

```
GET  /health                    Service health check
GET  /station                   Station metadata and stream URL
GET  /schedule                  Station schedule snapshot
GET  /now-playing               Current stream source and upcoming programs
GET  /schedule-blocks/:day      Schedule blocks for a given day (YYYY-MM-DD)
GET  /broadcast/status          Live broadcast source connection status
GET  /live.mp3                  Live audio stream (proxied from internal Icecast2)
GET  /media/:id                 Serve a media file
```

### Admin (require `Authorization: Bearer <API_KEY>` when `API_KEY` is set)

```
GET    /schedule-blocks         All schedule blocks
PUT    /schedule-blocks         Replace all schedule blocks; triggers playout refresh
GET    /broadcast/settings      BUTT/Icecast source settings, including source password
GET    /programs                List programs
POST   /programs                Create a program
PUT    /programs/:id            Update a program
DELETE /programs/:id            Delete a program
GET    /hosts                   List hosts
POST   /hosts                   Create a host
PUT    /hosts/:name             Update a host (cascades name changes to programs and blocks)
DELETE /hosts/:name             Delete a host
GET    /media                   List uploaded media files
POST   /media                   Upload a media file (binary body, X-File-Name header)
DELETE /media/:id               Delete a media file; triggers playout refresh
GET    /playout/current         Current Liquidsoap playout file path
```

## Station config

Station details live in `packages/config/src/station.ts`:

```ts
export const stationConfig: RadioStationInput = {
  id: '16rdio',
  name: '16 Radio',
  timezone: 'Africa/Lagos',
  mount: '/live.mp3',
  fallbackSource: { kind: 'playlist', playlistId: 'fallback' },
  schedule: [],
}
```

## Liquidsoap playout

Liquidsoap reads `current.txt` via a `request.dynamic` source. The API refreshes this file on every schedule block save, media delete, and on a 15-second polling interval. If no scheduled media is active, the fallback file (`/media/fallback/v1-tone.mp3`) is used. During scheduled live blocks, the API writes `broadcast` to `current.txt` and creates `broadcast-active` so Liquidsoap can switch to the `/broadcast.mp3` Harbor live input without shelling out on the audio clock.

## Live broadcast (BUTT)

The Broadcast view in the admin shows connection settings for BUTT (Broadcast Using This Tool). Connect BUTT to the Liquidsoap Harbor input using the source password from your env (`ICECAST_SOURCE_PASSWORD`). The password is only returned from the authenticated `GET /broadcast/settings` endpoint. Locally and in production, BUTT connects to the Harbor port (`HARBOR_PORT`, default `8005`) at mount `/broadcast.mp3`. Liquidsoap remains the only source publishing the public listener mount `/live.mp3`.
