# ── build stage ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
RUN corepack enable pnpm
WORKDIR /app

# Workspace manifests first for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json      apps/api/
COPY apps/web/package.json      apps/web/
COPY apps/worker/package.json   apps/worker/
COPY packages/rdio-core/package.json packages/rdio-core/
COPY packages/config/package.json    packages/config/
COPY packages/db/package.json        packages/db/

RUN pnpm install --frozen-lockfile

# Source files
COPY packages/ packages/
COPY apps/api/ apps/api/

# Build API and its workspace dependencies
RUN pnpm --filter=@rdio/api... run build

# Self-contained deployable: production node_modules only, no devDeps
RUN pnpm --filter @rdio/api deploy --prod /app/deploy

# ── runtime stage ─────────────────────────────────────────────────────────────
# Liquidsoap as the base so both processes share one container and one volume.
FROM savonet/liquidsoap:v2.2.5

# Install Node.js 22 (need root for apt-get)
USER root
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl gnupg2 \
 && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends nodejs icecast2 \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build /app/deploy .
COPY services/liquidsoap/station.liq /rdio/station.liq

# Ensure media directories exist; the Fly volume mounts at /media
RUN mkdir -p /media/uploads /media/schedule /media/fallback

COPY apps/api/start.sh /start.sh
RUN chmod +x /start.sh

ENV NODE_ENV=production
EXPOSE 3001
ENTRYPOINT []
CMD ["/start.sh"]
