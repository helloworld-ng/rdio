# ── build stage ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
RUN corepack enable pnpm
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json      apps/web/
COPY apps/api/package.json      apps/api/
COPY apps/worker/package.json   apps/worker/
COPY packages/auth/package.json      packages/auth/
COPY packages/rdio-core/package.json packages/rdio-core/
COPY packages/config/package.json    packages/config/
COPY packages/db/package.json        packages/db/
COPY packages/env/package.json       packages/env/
COPY packages/tsconfig/package.json packages/tsconfig/
COPY packages/ui/package.json       packages/ui/

RUN pnpm install --frozen-lockfile

COPY packages/ packages/
COPY apps/web/ apps/web/

# VITE_API_BASE_URL is baked into the bundle at build time.
# Pass it as --build-arg when running fly deploy (see fly.toml comment).
ARG VITE_API_BASE_URL=http://localhost:3001
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN pnpm --filter=@rdio/web... run build

# ── runtime stage ─────────────────────────────────────────────────────────────
FROM nginx:alpine
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
