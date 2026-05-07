# Multi-stage Next.js build using pnpm.
#
# Note: this just runs `next start` against the standard build. Image is
# ~600 MB (it includes node_modules); fine for a hackathon. If we want a
# smaller production image later, switch to `output: "standalone"` in
# next.config.ts and copy only `.next/standalone`.

FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@10.24.0 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.24.0 --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@10.24.0 --activate
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Copy everything we need to `next start`
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3000
CMD ["pnpm", "start"]
