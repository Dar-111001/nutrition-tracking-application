# API image: a small Node service in front of PocketBase.
# Stateless: no files written, all settings from env vars (see src/config.js).

# ---- Stage 1: install production dependencies ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- Stage 2: runtime ----
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=4000 \
    POCKETBASE_URL=http://pocketbase:8090 \
    HEALTHCHECK_PATH=/api/health

COPY --from=deps /app/node_modules ./node_modules
COPY package.json healthcheck.js ./
COPY src ./src

# Run as the image's unprivileged user
USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 CMD ["node", "healthcheck.js"]
CMD ["node", "src/server.js"]
