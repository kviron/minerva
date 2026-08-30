FROM oven/bun:1.3.14-debian AS dependencies
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM node:22.17.0-bookworm-slim AS build
WORKDIR /app
ENV NODE_ENV=production
COPY --from=dependencies /usr/local/bin/bun /usr/local/bin/bun
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json bun.lock nuxt.config.ts tsconfig.json components.json ./
COPY app ./app
COPY public ./public
COPY server ./server
COPY shared ./shared
COPY drizzle ./drizzle
COPY scripts/migrate-production.ts ./scripts/migrate-production.ts
RUN node node_modules/nuxt/bin/nuxt.mjs build \
  && mkdir -p .production \
  && bun build scripts/migrate-production.ts --target=bun --outfile=.production/migrate.mjs

FROM oven/bun:1.3.14-debian AS runtime
WORKDIR /app
ENV NODE_ENV=production \
  HOST=0.0.0.0 \
  PORT=3000
COPY --from=build --chown=bun:bun /app/.output ./.output
COPY --from=build --chown=bun:bun /app/.production/migrate.mjs ./migrate.mjs
COPY --from=build --chown=bun:bun /app/drizzle ./drizzle
USER bun
EXPOSE 3000
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=10s --timeout=4s --start-period=20s --retries=6 \
  CMD ["bun", "-e", "const response = await fetch('http://127.0.0.1:3000/api/health/ready'); process.exit(response.ok ? 0 : 1)"]
CMD ["bun", ".output/server/index.mjs"]
