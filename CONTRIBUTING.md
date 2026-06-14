# Contributing to rdio

Thanks for your interest in contributing! This guide covers how to get rdio running locally, what to check before opening a pull request, and the conventions that keep the project easy to maintain.

rdio is a single-station internet radio control suite. It includes a React admin app, a Fastify API, shared TypeScript packages, Postgres/Drizzle persistence, Cloudflare R2 media uploads, and local radio infrastructure through Icecast and Liquidsoap.

## Prerequisites

Before you start, install:

- **Node.js** 22 or newer
- **pnpm** 10.x, ideally the version in `package.json`
- **Docker** with Docker Compose v2 for local Postgres, Icecast, and Liquidsoap
- **Cloudflare R2** credentials if you need to run the API or test media uploads

You can use Corepack to activate the expected pnpm version:

```bash
corepack enable
corepack prepare pnpm@10.34.1 --activate
```

## Repository Structure

```text
apps/
  api/      Fastify API, auth routes, media routes, station state, stream proxy
  web/      React 19 + Vite station admin app
packages/
  auth/      Better Auth server/client integration
  config/    Static station configuration
  db/        Drizzle schema, client, and migrations
  env/       Runtime environment validation
  rdio-core/ Shared scheduling, playout, and station domain logic
  tsconfig/  Shared TypeScript configs
  ui/        Shared React UI primitives and styles
services/
  icecast/     Local Icecast notes and config home
  liquidsoap/  Liquidsoap station script
media/
  fallback/  Local fallback audio
  schedule/  Local schedule files
  uploads/   Local upload placeholder directory
```

## Getting Started

1. Fork and clone the repository.

```bash
git clone https://github.com/YOUR-USERNAME/rdio.git
cd rdio
git remote add upstream https://github.com/helloworld-ng/rdio.git
```

If the upstream URL has changed, use the canonical repository URL from GitHub.

2. Install dependencies.

```bash
pnpm install
```

3. Create environment files.

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

The root `.env` is used by Docker Compose and Drizzle. `apps/api/.env` is loaded by the API dev server. `apps/web/.env` configures Vite and the web app's API proxy.

4. Start local infrastructure.

```bash
docker compose up
```

This starts Postgres, Icecast, and Liquidsoap. If you only need Postgres, use:

```bash
pnpm db:up
```

5. Apply database migrations.

```bash
pnpm db:migrate
```

6. Start the TypeScript apps.

```bash
pnpm dev
```

You can also run each app independently:

```bash
pnpm api:dev
pnpm web:dev
```

Open the web admin at http://localhost:5173. The first browser to complete setup creates the station administrator. After setup, new members are created by an authenticated administrator from the Members view.

## Local Services

| Service | Default URL |
| --- | --- |
| Web admin | http://localhost:5173 |
| API | http://localhost:3001 |
| Postgres | `postgres://rdio:rdio@localhost:5432/rdio` |
| Icecast admin | http://localhost:8002/admin |
| Liquidsoap Harbor | `localhost:8005` |
| API stream proxy | http://localhost:3001/live.mp3 |

Docker Compose currently publishes Icecast on host port `8002`. The API defaults to `PUBLIC_STREAM_BASE_URL=http://localhost:8000`, so set that value to `http://localhost:8002` locally if you want API responses to point directly at the Compose Icecast service instead of relying on the API stream proxy.

## Environment Variables

Important local variables:

| Variable | Used by | Notes |
| --- | --- | --- |
| `DATABASE_URL` | API, Drizzle | Local default is `postgres://rdio:rdio@localhost:5432/rdio` |
| `API_PORT` | API | Defaults to `3001` |
| `WEB_PORT` | Web | Defaults to `5173` |
| `WEB_ORIGIN` | API CORS | Comma-separated allowed browser origins |
| `BETTER_AUTH_SECRET` | API/auth | Must be at least 32 characters |
| `BETTER_AUTH_URL` | API/auth | Usually `http://localhost:3001` in local dev |
| `VITE_API_BASE_URL` | Web | Usually `http://localhost:3001/api` locally |
| `RDIO_API_PROXY_TARGET` | Web dev server | Usually `http://localhost:3001` |
| `PUBLIC_STREAM_BASE_URL` | API | Public stream origin used in station responses |
| `ICECAST_SOURCE_PASSWORD` | API, Liquidsoap, Icecast | Must match across services |
| `R2_ACCOUNT_ID` | API | Required for media upload storage |
| `R2_ACCESS_KEY_ID` | API | Required for media upload storage |
| `R2_SECRET_ACCESS_KEY` | API | Required for media upload storage |
| `R2_BUCKET` | API | Required for media upload storage |
| `R2_PUBLIC_URL` | API | Public base URL for uploaded media |

The API validates required server env at startup. If you are working on API features, fill in the R2 values even when your change is not directly about uploads.

## Cloudflare R2 Setup

Media uploads use Cloudflare R2 through S3-compatible APIs.

1. Create an R2 bucket in Cloudflare.
2. Enable a public URL or custom public domain for objects.
3. Create an R2 API token with read/write access to the bucket.
4. Fill in `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, and `R2_PUBLIC_URL` in `apps/api/.env`.
5. For browser uploads, make sure the bucket CORS policy allows the local web origin.

This repository includes helper files for R2 CORS:

```bash
scripts/apply-r2-cors.sh
node scripts/apply-r2-cors.mjs
```

Review the script and `scripts/r2-cors.json` before applying changes to a real bucket.

## Database Development

Drizzle schema and migrations live in `packages/db`.

Common commands:

```bash
pnpm db:up
pnpm db:generate
pnpm db:migrate
pnpm db:push
pnpm db:check
pnpm db:studio
pnpm db:down
```

Use `pnpm db:generate` when schema changes should produce a checked-in migration. Use `pnpm db:push` only for quick local prototyping.

When a change affects persisted data, include the generated SQL migration and mention the operational impact in your PR.

## Development Workflow

Before opening a PR, run the relevant checks:

```bash
pnpm format
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

For smaller changes, run the narrowest useful command first, then run the full checks before review when practical. Examples:

```bash
pnpm --filter @rdio/rdio-core test
pnpm --filter @rdio/web typecheck
pnpm --filter @rdio/api build
```

The project uses Ultracite on top of Biome for formatting and linting. Most style issues are fixable with:

```bash
pnpm dlx ultracite fix
```

## Code Guidelines

- Follow the existing TypeScript style and package boundaries.
- Keep shared scheduling and playout behavior in `packages/rdio-core` when it is not tied to a specific app.
- Keep database schema and migration work in `packages/db`.
- Prefer explicit, readable logic over cleverness.
- Preserve accessibility in the web app: semantic elements, labels, keyboard-friendly controls, and useful alt text.
- Use existing UI primitives and the Rdio-inspired design direction in `design.md` for UI changes.
- Avoid unrelated refactors in feature or bug-fix PRs.
- Add or update tests when behavior changes, especially in shared domain logic.
- Document new environment variables, storage requirements, API changes, or deployment steps.

## Commit Messages

Conventional commits are not enforced in this repository. Still, try to keep commit messages clear and easy to scan.

Good examples:

```text
Add schedule block validation
Fix media upload size handling
docs: clarify local Icecast setup
```

Use a conventional-commit style prefix when it helps communicate intent, but do not contort a commit message just to fit a format.

## Pull Requests

Open PRs against the main repository with a focused description of what changed and why.

In the PR template:

- Summarize the change and link related issues.
- List the commands or manual steps you used to test.
- Call out operational impact, including environment variables, migrations, storage changes, API changes, stream behavior, or deployment changes.
- Add screenshots or recordings for visible UI changes.
- Mark the relevant change type.

Before requesting review, make sure you have reviewed your own diff and removed debug logging, temporary code, and accidental local-only changes.

## Working With Streams Locally

For the radio stack, the API, Icecast, and Liquidsoap need matching stream settings. In local Docker Compose:

- Icecast is exposed on host port `8002`.
- Liquidsoap connects to Icecast inside Docker on port `8000`.
- Harbor accepts live broadcast source connections on port `8005`.
- The default source password is `sourcepass`.

If stream URLs look wrong in the app, check `PUBLIC_STREAM_BASE_URL`, `ICECAST_PORT`, and whether you are using the API `/live.mp3` proxy or the public Icecast origin.

## Getting Help

If setup fails, include the command you ran, the relevant error output, your Node and pnpm versions, and whether Docker services are running. For product behavior issues, include reproduction steps and any screenshots or recordings that make the problem obvious.
