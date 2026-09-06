# Step 1: Base image
FROM node:22-alpine AS base

# Step 2: Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on package-lock.json
COPY package.json package-lock.json ./
RUN npm install

# Step 3: Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
RUN mkdir -p /app/public
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# NEXT_PUBLIC_* Firebase client config is read automatically from .env.production
# during the Next.js build. That file is included in the Docker build context
# and contains only public values safe for client bundles.
# Server-side secrets (GEMINI_API_KEY) are injected at runtime via Secret Manager.

RUN npm run build

# Step 4: Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# Create a non-root system user and group for security harding (OWASP A01 / Least Privilege)
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy static assets and standalone build output
COPY --from=builder /app/public ./public

# Set correct permissions for Next.js cache directory
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 8080

CMD ["node", "server.js"]
