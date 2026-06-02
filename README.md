# rdio

A single-station internet radio control suite: schedule editor, media library, live broadcast console, and stream automation.

The project keeps the product layer in TypeScript and delegates audio delivery to proven radio infrastructure:

- React 19 + Vite for the station admin SPA
- Fastify 5 for the HTTP API
- Postgres 18 + Drizzle ORM for application data
- Better Auth for user sessions and member management
- Shared TypeScript packages for scheduling logic and station config
- Liquidsoap for playout automation
- Icecast2 for listener streaming

## Deployment model

The API container can bundle Node.js, Icecast2, and Liquidsoap in a single machine. In that setup, the services communicate over `localhost`, and the Node.js API proxies the audio stream from the internal Icecast port at `GET /live.mp3`.

## Repository layout

```text
apps/web              Station admin SPA (schedule, programs, hosts, media, broadcast)
apps/api              Fastify route plugins + bundled radio services container
packages/auth         Shared Better Auth server and browser client configuration
packages/db           Drizzle client, schema, and migrations
packages/env          Validated database and API environment variables
packages/rdio-core    Shared scheduling and playout types and logic
packages/config       Single-station configuration
services/liquidsoap   Liquidsoap playout script
services/icecast      Icecast config templates (used for local Docker dev)
```

## Prerequisites

- Node.js 22+
- pnpm 9+
- Docker (for local Postgres, Icecast, and Liquidsoap)

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

Start the local infrastructure (Postgres + Icecast + Liquidsoap):

```bash
cp .env.example .env
docker compose up
```

The first run downloads the Postgres, Icecast, and Liquidsoap container images. To confirm that the local stream is available, open http://localhost:8000/live.mp3.

Apply database migrations before starting the apps:

```bash
pnpm db:migrate
```

Open http://localhost:5173 after the API starts. The first browser to complete setup creates the station administrator. After that, new accounts can only be created by an authenticated administrator from the Members view.

Default local endpoints:

| Service | URL |
|---------|-----|
| Web admin | http://localhost:5173 |
| API | http://localhost:3001 |
| Postgres | postgres://rdio:rdio@localhost:5432/rdio |
| Icecast admin | http://localhost:8000/admin |
| Stream | http://localhost:3001/live.mp3 |

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_DB` | `rdio` | Local Compose Postgres database name |
| `POSTGRES_USER` | `rdio` | Local Compose Postgres user |
| `POSTGRES_PASSWORD` | `rdio` | Local Compose Postgres password |
| `DATABASE_URL` | `postgres://rdio:rdio@localhost:5432/rdio` | Postgres connection string |
| `API_PORT` | `3001` | Port the Fastify API listens on |
| `WEB_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |
| `BETTER_AUTH_SECRET` | _(required)_ | Strong random secret used to sign Better Auth cookies and tokens |
| `BETTER_AUTH_URL` | `http://localhost:3001` | Public API origin used by Better Auth |
| `VITE_API_BASE_URL` | `http://localhost:3001` | API base URL baked into the web build at build time |
| `PUBLIC_STREAM_BASE_URL` | _(request origin)_ | Optional public stream origin used to build `streamUrl` in API responses. Leave blank to use the API's `/live.mp3` proxy |
| `ICECAST_HOST` | `localhost` | Icecast host (Liquidsoap connects here) |
| `ICECAST_PORT` | `8001` in the bundled API container, `8000` for local Docker Compose Icecast | Icecast port |
| `HARBOR_PORT` | `8005` | Liquidsoap Harbor port for BUTT live broadcast source connections |
| `ICECAST_SOURCE_PASSWORD` | `sourcepass` | Icecast source password |

In a bundled production container, `ICECAST_HOST=localhost` and `ICECAST_PORT=8001` since Icecast runs inside the same container. Set `PUBLIC_STREAM_BASE_URL` only when browsers should play from a separate public Icecast origin instead of the API proxy.

## Database development

Postgres and Drizzle store authentication data. The API still stores station content under `media/`; later migrations can move domain data into Postgres incrementally.

```bash
pnpm db:up
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

Use `pnpm db:push` for rapid local schema prototyping and `pnpm db:check` to validate generated migrations.

## Deployment

### API (with Icecast2 + Liquidsoap bundled)

Deploy from the repo root so the Dockerfile context includes the whole workspace:

```bash
docker build -f apps/api/Dockerfile -t <api-image-name> .
```

Set required secrets:

| Secret | Description |
|--------|-------------|
| `DATABASE_URL` | Postgres connection string |
| `BETTER_AUTH_SECRET` | Strong random secret used to sign Better Auth cookies and tokens |
| `BETTER_AUTH_URL` | Public API origin used by Better Auth |
| `ICECAST_SOURCE_PASSWORD` | Password Liquidsoap uses to publish to Icecast |

Mount persistent storage at `/media`, then add a fallback audio file so Liquidsoap has something to play when nothing is scheduled:

```bash
mkdir -p /media/fallback
cp /path/to/fallback.mp3 /media/fallback/v1-tone.mp3
```

### Web

The web app can be deployed by building `apps/web` with the API URL available at build time. If using GitHub Actions, set this repository secret:

| Secret | Value |
|--------|-------|
| `VITE_API_BASE_URL` | Public API origin |

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

### Authenticated station UI

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

### Authentication and members

```
GET    /auth/setup-status       Whether the first administrator still needs to be created
GET    /auth/me                 Current authenticated session
POST   /auth/change-password    Replace a temporary password
GET    /members                 List members (administrator only)
POST   /members                 Create a member with a temporary password (administrator only)
*      /api/auth/*              Better Auth session endpoints
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
