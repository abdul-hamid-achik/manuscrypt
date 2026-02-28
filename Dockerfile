FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Build
FROM deps AS build
COPY . .
RUN bun run build

# Production
FROM base AS production

# Create non-root user
RUN addgroup --system --gid 1001 app && adduser --system --uid 1001 --ingroup app app

COPY --from=build /app/.output /app/.output
COPY --from=build /app/package.json /app/

# Create data directory for SQLite and set ownership
RUN mkdir -p /app/data && chown -R app:app /app/data

VOLUME /app/data

EXPOSE 3000
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

USER app
CMD ["bun", ".output/server/index.mjs"]
