# syntax=docker/dockerfile:1
#
# Next.js 13.5 / Node 20. Four stages:
#   deps    -> install node_modules once, cached as long as package*.json don't change
#   dev     -> used by docker-compose.yml: source is bind-mounted over this, hot reload
#   builder -> runs `next build` (output: 'standalone', see next.config.js)
#   runner  -> used by docker-compose.prod.yml: just node + the traced standalone output

FROM node:20-alpine AS deps
# libc6-compat: Next.js/SWC's native bindings need it on musl (Alpine) libc.
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------------------------------------------------------------------------
FROM deps AS dev
WORKDIR /app
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ---------------------------------------------------------------------------
FROM deps AS builder
WORKDIR /app
COPY . .
# NEXT_PUBLIC_* vars are inlined into the client JS bundle at build time, so
# the value used by the browser in production must be supplied as a build
# arg here -- setting it only at `docker run`/compose `environment:` time
# would have no effect on code already bundled.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV DOCKER_BUILD=1
RUN npm run build

# ---------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
