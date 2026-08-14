# The Next.js frontend. Built in CI and pulled by the box -- never built on the
# box, where `next build` would compete for RAM with the database it is being
# deployed alongside.
#
# Build context is web/, so `prebuild` (scripts/sync-landing.mjs) will not find
# ../marketing. That is intended: it leaves the committed web/public/landing
# copy in place and says so, rather than failing.

FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Inlined into the client bundle by the `env` block in next.config.mjs. Empty
# means "same origin", which is what Caddy serves. Passing this at runtime
# instead has no effect whatsoever -- the value is compiled in here.
ARG NEXT_PUBLIC_API_BASE=""
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN groupadd --system nodejs && useradd --system --gid nodejs nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000
CMD ["node", "server.js"]
