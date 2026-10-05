# Dar Nutrition App

A personal nutrition tracking app built with React + Vite, backed by a self-hosted PocketBase database. Track daily food intake, set macro goals, and manage a personal food library — all running locally in Docker with no external cloud dependencies.

---

## Features

- Daily food journal with macro tracking (protein, carbs, fat)
- Macro portion system (1 portion = 30g protein / 30g carbs / 10g fat)
- Personal food library with per-100g nutritional values
- Monthly progress tracker
- Self-hosted database — your data stays on your machine

---

## Architecture

```
            browser
               │  one port: :3000 locally, :80 behind the load balancer on ECS
               ▼
   ┌──────────────────────────────┐        ┌──────────────────────────────┐
   │ app  (nginx)                 │        │ pocketbase                   │
   │  /          → React app      │  /api  │  REST API + admin UI (/_/)   │
   │  /api, /_/  → PocketBase ────┼───────▶│  SQLite in /pb/pb_data       │
   │  /health    → PocketBase     │        │  (docker volume / AWS EFS)   │
   └──────────────────────────────┘        └──────────────────────────────┘
        stateless, no secrets                 the only stateful container
```

- The browser only talks to nginx. nginx serves the built React files and forwards `/api` and `/_/` to PocketBase, so there is no CORS and no backend URL inside the JavaScript bundle.
- Both images are built once and configured only through environment variables, so the same image runs in docker compose and on ECS.
- The data collections require a signed-in user. The app shows a login screen; the login is created from env vars on startup and public sign-up is disabled.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Tailwind CSS, shadcn/ui |
| Database | PocketBase 0.22 (SQLite) |
| Web server | nginx (serves the React app, proxies the API) |
| Runtime | Docker + Docker Compose locally, AWS ECS (Fargate) + EFS in the cloud |

---

## Folder Structure

```
.
├── src/
│   ├── api/
│   │   ├── pocketbaseClient.js   # PocketBase client (same-origin /api)
│   │   ├── localStore.js         # list/create/update/delete wrapper
│   │   ├── entities.js           # Food, DailyGoals, FoodItem exports
│   │   └── integrations.js       # OpenFoodFacts search
│   ├── components/
│   │   ├── AuthGate.jsx          # Login screen shown until signed in
│   │   └── nutrition/            # FoodForm, FoodList, DailyProgress, QuickAddFoodDialog
│   ├── pages/                    # Home, FoodLibrary, MonthlyTracker, Layout, router
│   └── main.jsx
├── nginx/
│   ├── nginx.conf.template       # Site config: SPA fallback, /api proxy, /health
│   ├── healthcheck-env.sh        # Reads HEALTHCHECK_URL / _PORT / _PATH
│   ├── 10-healthcheck.envsh      # Startup: validates them, adds a health-only port if needed
│   ├── healthcheck-server.conf.template
│   └── healthcheck.sh            # Container health check command
├── deploy/
│   └── ecs-task-definition.json  # Example Fargate task definition (fill in the <...>)
├── Dockerfile                    # Multi-stage: Node build → nginx serve
├── Dockerfile.pocketbase         # PocketBase container with auto-setup
├── pb_setup.sh                   # Creates admin, collections, app login (idempotent)
├── docker-compose.yml            # Runs app + pocketbase together
└── .env.example                  # Template for the credentials
```

---

## Running Locally with Docker

Prerequisite: [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

```bash
git clone https://github.com/Dar-111001/nutrition-tracking-application.git
cd nutrition-tracking-application
cp .env.example .env        # then set your own passwords
docker compose up --build
```

First run takes 2–3 minutes (downloads Node, nginx, PocketBase, installs packages, builds). On every start PocketBase automatically:
- creates the admin account from `PB_ADMIN_EMAIL` / `PB_ADMIN_PASSWORD`
- creates the `food`, `daily_goals` and `food_items` collections, readable and writable only by signed-in users
- creates the app login from `APP_USER_EMAIL` / `APP_USER_PASSWORD` (or the admin pair if those are not set) and turns off public sign-up

| Service | URL |
|---------|-----|
| App (sign in with the app login) | http://localhost:3000 |
| PocketBase admin UI | http://localhost:3000/_/ |
| Health check | http://localhost:3000/health |

```bash
docker compose down                              # stop, keeps data
docker compose up                                # start again
docker compose up --build                        # rebuild after code changes
docker compose down -v && docker compose up --build   # full reset, wipes the database
```

### Frontend dev server

```bash
docker compose up pocketbase   # database only
npm install && npm run dev     # Vite proxies /api and /_ to localhost:8090
```

---

## Environment Variables

### `app` container (nginx)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `80` | Port nginx listens on |
| `POCKETBASE_URL` | `http://pocketbase:8090` | Where nginx reaches PocketBase. Compose: `http://pocketbase:8090`. ECS (same task): `http://localhost:8090` |
| `HEALTHCHECK_PATH` | `/health` | Health check route |
| `HEALTHCHECK_PORT` | same as `PORT` | Port for the health check. If different from `PORT`, nginx opens it and serves only the health check there |
| `HEALTHCHECK_URL` | – | Shortcut that sets both, e.g. `http://localhost:8081/healthz` |

The health check answers `200` only when PocketBase is up too (it forwards to PocketBase's `/api/health`), and `502` otherwise.

### `pocketbase` container

| Variable | Default | Description |
|----------|---------|-------------|
| `PB_ADMIN_EMAIL` | – (required) | PocketBase admin email |
| `PB_ADMIN_PASSWORD` | – (required) | PocketBase admin password |
| `APP_USER_EMAIL` | `PB_ADMIN_EMAIL` | Email to sign in to the app |
| `APP_USER_PASSWORD` | `PB_ADMIN_PASSWORD` | Password to sign in to the app. Re-applied on every start, so changing it and restarting changes the password |
| `PB_PORT` | `8090` | PocketBase port |
| `PB_DATA_DIR` | `/pb/pb_data` | Where the database lives. Must be a persistent volume |

Locally these come from `.env` (gitignored, and excluded from image builds). Nothing secret is baked into either image.

---

## Deploying to AWS (ECR + ECS Fargate)

### 1. Push the images

```bash
export REGISTRY=<ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com TAG=v1
aws ecr create-repository --repository-name nutrition-app
aws ecr create-repository --repository-name nutrition-pocketbase
aws ecr get-login-password | docker login --username AWS --password-stdin $REGISTRY
docker compose build && docker compose push
```

`docker-compose.yml` names the images `${REGISTRY}/nutrition-app:${TAG}` and `${REGISTRY}/nutrition-pocketbase:${TAG}`, so build and push need no extra steps. Build on the same CPU architecture as your task (or add `--platform linux/amd64` / use ARM64 Fargate).

### 2. Persistent storage: EFS

Fargate container storage is thrown away on every deploy, so the database must live on EFS:
1. Create an EFS file system in the same VPC, with a mount target in each subnet the task uses.
2. Allow NFS (TCP 2049) from the task's security group to the EFS security group.
3. Mount it at `/pb/pb_data` in the `pocketbase` container (see `volumes` / `mountPoints` in `deploy/ecs-task-definition.json`).

### 3. Task definition

Use `deploy/ecs-task-definition.json` as the starting point and fill in the `<...>` values. Both containers run in **one task**, so nginx reaches PocketBase at `http://localhost:8090`. Store the passwords in SSM Parameter Store or Secrets Manager (the example uses `secrets`, which needs the execution role to be allowed to read them).

### 4. Service and load balancer

- **Desired count: exactly 1.** PocketBase uses SQLite, which supports a single writer: never run two tasks against the same EFS data. Set the deployment to minimum healthy 0% / maximum 100% so the old task stops before the new one starts.
- Target group: target type `ip`, port 80 (the `app` container), health check path `/health` (or whatever `HEALTHCHECK_PATH` / `HEALTHCHECK_PORT` you set). Give the service a health check grace period of about 60 seconds for the first start.
- Only the `app` container needs to be reachable from the load balancer. PocketBase's port 8090 stays private to the task.
- Put HTTPS on the load balancer (ACM certificate): the login sends a password.
