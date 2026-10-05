# Frontend image: React app built with Node, served by nginx.
# Stateless and environment-agnostic: build once, configure with env vars at runtime.

# ---- Stage 1: build the static site ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
# npm ci installs exactly what package-lock.json pins; fall back until the lockfile lands
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .
# No backend URL is baked in: the app calls /api on its own origin and nginx proxies it.
RUN npm run build

# ---- Stage 2: serve it with nginx ----
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# Our config replaces the image's default site
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx/nginx.conf.template                /etc/nginx/templates/default.conf.template
COPY nginx/healthcheck-server.conf.template   /etc/nginx/optional-templates/healthcheck-server.conf.template
COPY nginx/healthcheck-env.sh                 /usr/local/lib/healthcheck-env.sh
COPY nginx/10-healthcheck.envsh               /docker-entrypoint.d/10-healthcheck.envsh
COPY nginx/healthcheck.sh                     /usr/local/bin/healthcheck

# Defaults suit docker compose; override any of them at runtime (e.g. in the ECS task definition)
ENV PORT=80 \
    API_URL=http://api:4000 \
    POCKETBASE_URL=http://pocketbase:8090 \
    HEALTHCHECK_PATH=/health

EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 CMD ["healthcheck"]
