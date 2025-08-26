# Use Bun runtime for optimal performance
FROM oven/bun:1-alpine as base
WORKDIR /app

# Install dependencies
FROM base as deps
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

# Build stage
FROM base as build
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run db:generate
RUN bun build src/index.ts --target=bun --outdir=dist --minify

# Production stage
FROM base as production
WORKDIR /app

# Copy dependencies and built app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

EXPOSE 3001

CMD ["bun", "run", "dist/index.js"]