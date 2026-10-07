# Dar Nutrition App

A personal nutrition tracking app built with React + Vite, backed by a self-hosted PocketBase database. Track daily food intake, set macro goals, and manage a personal food library. It runs locally with one `docker compose up`, and the same images deploy to AWS, Google Cloud or Azure with the Terraform in `infrastructure/`.

**Jump to:** [Run it locally](#running-locally-with-docker) · [Deploy to AWS](#deploying-to-aws-ecs-fargate) · [Deploy to Google Cloud](#deploying-to-google-cloud-cloud-run) · [Deploy to Azure](#deploying-to-azure-container-apps)

## Contents

- [Features](#features)
- [Architecture](#architecture)
- [API contract](#api-contract)
- [Tech Stack](#tech-stack)
- [Folder Structure](#folder-structure)
- [Running Locally with Docker](#running-locally-with-docker)
- [Environment Variables](#environment-variables)
- [Deploying to the cloud](#deploying-to-the-cloud)
  - [AWS (ECS Fargate)](#deploying-to-aws-ecs-fargate)
  - [Google Cloud (Cloud Run)](#deploying-to-google-cloud-cloud-run)
  - [Azure (Container Apps)](#deploying-to-azure-container-apps)

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
               │  one port: :3000 locally, :80 behind the cloud load balancer
               ▼
   ┌─────────────────────────┐      ┌─────────────────────────┐      ┌──────────────────────────┐
   │ app  (nginx)            │      │ api  (Node, Express)    │      │ pocketbase               │
   │  /        → React app   │ /api │  REST API, JSON contract│      │  database + admin UI     │
   │  /api     → api ────────┼─────▶│  validation, login,     ├─────▶│  SQLite in /pb/pb_data   │
   │  /_/      → PocketBase  │      │  OpenFoodFacts proxy    │      │  (volume / file share)   │
   │  /health  → api ready   │      │  /api/health, /api/ready│      │                          │
   └─────────────────────────┘      └─────────────────────────┘      └──────────────────────────┘
        stateless, no secrets            stateless, no secrets          the only stateful container
```

- The browser only talks to nginx. nginx serves the built React files, forwards `/api` to the Node API and `/_/` to the PocketBase admin UI, so there is no CORS and no backend URL inside the JavaScript bundle.
- The Node API is the only thing that talks to PocketBase. Every response it sends follows one JSON contract (below), so the frontend handles success and failure the same way everywhere.
- All images are built once and configured only through environment variables, so the same image runs in docker compose, on ECS, on Cloud Run and on Container Apps.
- The data collections require a signed-in user. The app shows a login screen; the login is created from env vars on startup and public sign-up is disabled.

## API contract

Every `/api` response body has one of two shapes:

```json
{ "ok": true,  "data": { } }
{ "ok": false, "error": { "code": "validation", "message": "protein_grams must be a number between 0 and 5000.", "details": { "field": "protein_grams" } } }
```

`code` is one of `validation` (400), `unauthorized` (401), `not_found` (404), `rate_limited` (429), `server` (502/503), `timeout` (504), `unknown` (500). The frontend adds `network` and `timeout` for failures that never reach the server. nginx answers in the same shape when the API itself is down.

| Method and path | What it does |
|---|---|
| `POST /api/auth/login` | `{ email, password }` → `{ token, user }` |
| `POST /api/auth/refresh` | Fresh token for a still-valid one |
| `GET /api/foods?date=` or `?from=&to=` | Logged foods for a day or a date range |
| `POST /api/foods`, `PATCH /api/foods/:id`, `DELETE /api/foods/:id` | Log, edit, delete a food (the API computes the portions) |
| `DELETE /api/foods?date=` | Clear a day |
| `GET /api/goals`, `PUT /api/goals` | Daily macro goals |
| `GET/POST /api/food-items`, `PATCH/DELETE /api/food-items/:id` | Food library |
| `POST /api/food-items/import` | `{ items: [...] }`, saves valid rows, lists the failed ones |
| `GET /api/food-search?q=` | Macros per 100 g from OpenFoodFacts |
| `GET /api/health` | Liveness: the API process is up |
| `GET /api/ready` | Readiness: the API can reach PocketBase (503 if not) |

All routes except login and the health checks need `Authorization: Bearer <token>`.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Tailwind CSS, shadcn/ui |
| API | Node.js 22, Express |
| Database | PocketBase 0.22 (SQLite) |
| Web server | nginx (serves the React app, proxies `/api` to the Node API) |
| Runtime | Docker + Docker Compose locally; AWS ECS Fargate + EFS, Google Cloud Run, or Azure Container Apps in the cloud (Terraform) |

---

## Folder Structure

```
.
├── src/
│   ├── api/
│   │   ├── client.js             # fetch wrapper: timeouts, always { ok, data } / { ok, error }
│   │   ├── session.js            # signed-in token, kept in localStorage
│   │   ├── auth.js               # login, logout, refresh
│   │   └── entities.js           # Food, DailyGoals, FoodItem, searchFood
│   ├── components/
│   │   ├── AuthGate.jsx          # Login screen shown until signed in
│   │   └── nutrition/            # FoodForm, FoodList, DailyProgress, QuickAddFoodDialog
│   ├── pages/                    # Home, FoodLibrary, MonthlyTracker, Layout, router
│   └── main.jsx
├── api/                          # Node API (its own image)
│   ├── src/
│   │   ├── server.js             # Starts the server, graceful shutdown on SIGTERM
│   │   ├── app.js                # Routes, auth, the single error handler
│   │   ├── config.js             # Every env var the API reads
│   │   ├── lib/                  # Response contract, PocketBase client, validation
│   │   └── routes/               # health, auth, foods, goals, foodItems, foodSearch
│   ├── test/api.test.js          # npm test: API against a fake PocketBase
│   ├── healthcheck.js            # Container health check command
│   └── Dockerfile
├── nginx/
│   ├── nginx.conf.template       # Site config: SPA fallback, /api proxy, /health
│   ├── healthcheck-env.sh        # Reads HEALTHCHECK_URL / _PORT / _PATH
│   ├── 10-healthcheck.envsh      # Startup: validates them, adds a health-only port if needed
│   ├── healthcheck-server.conf.template
│   └── healthcheck.sh            # Container health check command
├── infrastructure/
│   ├── README.md                 # How to deploy with Terraform (plan/apply by hand only)
│   ├── aws/                      # Terraform: ECS Fargate + ALB + EFS (+ state bootstrap)
│   ├── gcp/                      # Terraform: Cloud Run + bucket/Filestore (+ state bootstrap)
│   ├── azure/                    # Terraform: Container Apps + Azure Files (+ state bootstrap)
│   └── ecs/task-definition.json  # Example Fargate task definition (fill in the <...>)
├── .github/workflows/ci.yml      # CI: builds the frontend and every image, no cloud credentials
├── Dockerfile                    # Multi-stage: Node build → nginx serve
├── Dockerfile.pocketbase         # PocketBase container with auto-setup
├── pb_setup.sh                   # Creates admin, collections, app login (idempotent)
├── docker-compose.yml            # Runs app + api + pocketbase together
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

The images are built for `linux/amd64`, the CPU the cloud stacks run on, so what you build on any machine can be pushed as is. On an Apple Silicon Mac, Docker Desktop runs them through emulation, which works but is a little slower. For native speed, set `DOCKER_PLATFORM=linux/arm64` in `.env` (see `.env.example`), and remove it again before building images to push.

First run takes 2–3 minutes (downloads Node, nginx, PocketBase, installs packages, builds). On every start PocketBase automatically:
- creates the admin account from `PB_ADMIN_EMAIL` / `PB_ADMIN_PASSWORD`
- creates the `food`, `daily_goals` and `food_items` collections, readable and writable only by signed-in users
- creates the app login from `APP_USER_EMAIL` / `APP_USER_PASSWORD` (or the admin pair if those are not set) and turns off public sign-up

| Service | URL |
|---------|-----|
| App (sign in with the app login) | http://localhost:3000 |
| PocketBase admin UI | http://localhost:3000/_/ |
| Health check | http://localhost:3000/health |
| API (direct, for curl) | http://localhost:4000/api/health |

```bash
docker compose down                              # stop, keeps data
docker compose up                                # start again
docker compose up --build                        # rebuild after code changes
docker compose down -v && docker compose up --build   # full reset, wipes the database
```

### Frontend dev server

```bash
docker compose up api pocketbase   # API and database only
npm install && npm run dev         # Vite proxies /api to localhost:4000 and /_ to localhost:8090
```

### API dev server and tests

```bash
docker compose up pocketbase
cd api && npm install
POCKETBASE_URL=http://localhost:8090 npm run dev   # restarts on file changes
npm test
```

---

## Environment Variables

### `app` container (nginx)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `80` | Port nginx listens on |
| `API_URL` | `http://api:4000` | Where nginx reaches the Node API. Compose: `http://api:4000`. ECS (same task): `http://localhost:4000` |
| `POCKETBASE_URL` | `http://pocketbase:8090` | Where nginx reaches the PocketBase admin UI (`/_/`). ECS (same task): `http://localhost:8090` |
| `HEALTHCHECK_PATH` | `/health` | Health check route |
| `HEALTHCHECK_PORT` | same as `PORT` | Port for the health check. If different from `PORT`, nginx opens it and serves only the health check there |
| `HEALTHCHECK_URL` | – | Shortcut that sets both, e.g. `http://localhost:8081/healthz` |

The health check answers `200` only when the API and PocketBase are both up (it forwards to the API's `/api/ready`), and `502`/`503` otherwise.

### `api` container (Node)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | Port the API listens on |
| `POCKETBASE_URL` | `http://pocketbase:8090` | Where the API reaches PocketBase. ECS (same task): `http://localhost:8090` |
| `HEALTHCHECK_PATH` | `/api/health` | Liveness route (the container health check uses it) |
| `HEALTHCHECK_PORT` | same as `PORT` | If different, the API also answers the liveness check on this port |
| `HEALTHCHECK_URL` | – | Shortcut that sets both |
| `UPSTREAM_TIMEOUT_MS` | `5000` | How long to wait for PocketBase |
| `FOOD_SEARCH_TIMEOUT_MS` | `8000` | How long to wait for OpenFoodFacts |
| `OPENFOODFACTS_URL` | `https://world.openfoodfacts.org` | Food search service |

### `pocketbase` container

| Variable | Default | Description |
|----------|---------|-------------|
| `PB_ADMIN_EMAIL` | – (required) | PocketBase admin email |
| `PB_ADMIN_PASSWORD` | – (required) | PocketBase admin password |
| `APP_USER_EMAIL` | `PB_ADMIN_EMAIL` | Email to sign in to the app |
| `APP_USER_PASSWORD` | `PB_ADMIN_PASSWORD` | Password to sign in to the app. Re-applied on every start, so changing it and restarting changes the password |
| `PB_PORT` | `8090` | PocketBase port |
| `PB_DATA_DIR` | `/pb/pb_data` | Where the database lives. Must be a persistent volume |

Locally these come from `.env` (gitignored, and excluded from image builds). Nothing secret is baked into any image.

---

## Deploying to the cloud

The [`infrastructure/`](infrastructure/README.md) folder has Terraform that deploys the app to an **empty account** on three clouds. It creates the network, identity, image registry, secrets, database storage and the service itself:

| Cloud | Runs on | Database storage | Folder |
|---|---|---|---|
| [AWS](#deploying-to-aws-ecs-fargate) | ECS on Fargate behind an Application Load Balancer | EFS | [`infrastructure/aws`](infrastructure/aws) |
| [Google Cloud](#deploying-to-google-cloud-cloud-run) | Cloud Run | Cloud Storage bucket (FUSE), or Filestore | [`infrastructure/gcp`](infrastructure/gcp) |
| [Azure](#deploying-to-azure-container-apps) | Azure Container Apps | Azure Files | [`infrastructure/azure`](infrastructure/azure) |

On every cloud the three containers run together in one unit (an ECS task, a Cloud Run instance, a Container App replica), so they reach each other on `localhost`. That unit is capped at **one copy**, because PocketBase stores its data in SQLite, which allows a single writer.

> **Run `terraform plan` and `terraform apply` by hand, never in CI.** A person should read every plan before it changes a cloud account, and cloud credentials should never be stored in CI. The repository's CI only builds the images: it has no cloud access and pushes nothing, so you push the images yourself (step 4 below).

You need Terraform 1.10 or newer, Docker, and the cloud's CLI logged in to your account. Every cloud follows the same five steps:

1. **Create the state backend, once per account:** `bootstrap/` makes the bucket or storage account where Terraform keeps its state.
2. **Point the main stack at it:** paste the `backend_config` output into `backend.hcl`.
3. **Fill in `terraform.tfvars`:** replace every `<...>` placeholder. Every other setting is listed there too, commented out with its default. Passwords can stay empty, because Terraform generates them.
4. **Create the registry, push the images, then deploy everything:** the service can't start before its images exist.
5. **Open the app:** `terraform output app_url`. Log in with your admin email and `terraform output -raw pocketbase_admin_password`.

The commands for each cloud are below. [infrastructure/README.md](infrastructure/README.md) explains the choices behind each stack, how the health checks work, the costs, and the known limits.

To bring the bill to zero between demos, set `create = false` in `terraform.tfvars` and apply. That deletes every resource of the stack, the database included. Set it back to `true` and apply to rebuild everything. See [Turning the app off and on](infrastructure/README.md#turning-the-app-off-and-on-create).

To ship a new version, push the images with a new tag, set `image_tag` in `terraform.tfvars`, and run `terraform plan` / `terraform apply` again.

`docker-compose.yml` builds every image for `linux/amd64`, the CPU all three clouds run, so this works from an Apple Silicon Mac too, with no extra flags. Cloud Run and Container Apps reject arm64 images ("must support amd64/linux"), so make sure `DOCKER_PLATFORM` isn't set to `linux/arm64` in your shell or `.env` when you push. On AWS you can run Graviton instead: set `cpu_architecture = "ARM64"` in `terraform.tfvars` and build with `DOCKER_PLATFORM=linux/arm64`.

---

## Deploying to AWS (ECS Fargate)

What it creates:

- **Network:** a VPC (`10.0.0.0/16`) over two availability zones, with public and private subnets.
- **Load balancer:** an Application Load Balancer, with HTTPS when you set `certificate_arn`.
- **Service:** an ECS cluster and a service running one Fargate task. The task is in a public subnet, and its security group only lets the load balancer in. There is no NAT gateway, which keeps the cost down.
- **Database storage:** EFS mounted at `/pb/pb_data`.
- **Images, passwords and logs:** three ECR repositories, the passwords in SSM Parameter Store, and CloudWatch Logs.

It costs roughly 25 to 40 USD a month while it runs.

```bash
aws configure                                   # or aws sso login

# 1. State backend: fill in infrastructure/aws/bootstrap/terraform.tfvars first
cd infrastructure/aws/bootstrap
terraform init
terraform plan -out=tfplan                      # read it
terraform apply tfplan
terraform output backend_config                 # 2. paste this into ../backend.hcl

# 3. Fill in infrastructure/aws/terraform.tfvars (account ID, region, admin email)

# 4a. Create the ECR repositories first
cd ..
terraform init -backend-config=backend.hcl
terraform plan -target=module.ecr -out=tfplan   # read it
terraform apply tfplan
export REGISTRY=$(terraform output -raw registry_url) TAG=latest

# 4b. Build and push the images (from the repository root)
cd ../..
aws ecr get-login-password | docker login --username AWS --password-stdin "$REGISTRY"
docker compose build && docker compose push

# 4c. Deploy everything else
cd infrastructure/aws
terraform plan -out=tfplan                      # read it
terraform apply tfplan

# 5. Open the app
terraform output app_url
terraform output -raw pocketbase_admin_password
```

`infrastructure/ecs/task-definition.json` is a hand-written example of the same task, if you'd rather wire ECS yourself. Terraform builds this task for you.

---

## Deploying to Google Cloud (Cloud Run)

What it creates:

- **Project:** with `bootstrap/`, either a new project (with billing linked) or an existing one, with the APIs it needs turned on.
- **Network:** a VPC with one subnet (`10.10.0.0/24`), used through Direct VPC egress.
- **Identity:** a dedicated service account.
- **Service:** a Cloud Run service with the three containers in one instance, scaling from 0 to 1.
- **Images and passwords:** an Artifact Registry repository, and the passwords in Secret Manager.
- **Database storage:** by default a Cloud Storage bucket mounted with Cloud Storage FUSE. Set `pocketbase_storage = "filestore"` for real NFS, which costs about 200 USD a month.

It usually stays inside the free tier, because Cloud Run scales to zero and bills CPU only while it handles a request.

```bash
gcloud auth login
gcloud auth application-default login

# 1. State backend (and optionally the project): fill in infrastructure/gcp/bootstrap/terraform.tfvars first
cd infrastructure/gcp/bootstrap
terraform init
terraform plan -out=tfplan                      # read it
terraform apply tfplan
terraform output backend_config                 # 2. paste this into ../backend.hcl

# 3. Fill in infrastructure/gcp/terraform.tfvars (project ID, region, admin email)

# 4a. Create the Artifact Registry repository first
cd ..
terraform init -backend-config=backend.hcl
terraform plan -target=module.artifact_registry -out=tfplan   # read it
terraform apply tfplan
export REGISTRY=$(terraform output -raw registry_url) TAG=latest

# 4b. Build and push the images (from the repository root)
cd ../..
gcloud auth configure-docker "${REGISTRY%%/*}"
docker compose build && docker compose push

# 4c. Deploy everything else
cd infrastructure/gcp
terraform plan -out=tfplan                      # read it
terraform apply tfplan

# 5. Open the app (a https://...run.app URL)
terraform output app_url
terraform output -raw pocketbase_admin_password
```

With `min_instances = 0` (the default), the first request after a quiet spell waits a few seconds while the containers start.

---

## Deploying to Azure (Container Apps)

What it creates:

- **Resource group and network:** a resource group, and a VNet (`10.20.0.0/16`) with a subnet delegated to Container Apps, protected by an NSG.
- **Identity:** a user-assigned managed identity that pulls images from the registry.
- **Images:** a Basic Azure Container Registry.
- **Database storage:** a Standard Azure Files share mounted at `/pb/pb_data`. Its storage account accepts traffic only from the app's subnet.
- **Logs:** a Log Analytics workspace.
- **Service:** a Container Apps environment with one Container App, scaling from 0 to 1, with the passwords stored as Container App secrets.

It costs about 5 USD a month for the registry. The app itself usually stays inside the monthly free grant.

```bash
az login
az account set --subscription <YOUR_AZURE_SUBSCRIPTION_ID>

# 1. State backend: fill in infrastructure/azure/bootstrap/terraform.tfvars first
cd infrastructure/azure/bootstrap
terraform init
terraform plan -out=tfplan                      # read it
terraform apply tfplan
terraform output backend_config                 # 2. paste this into ../backend.hcl

# 3. Fill in infrastructure/azure/terraform.tfvars (subscription ID, region, admin email)

# 4a. Create the container registry first
cd ..
terraform init -backend-config=backend.hcl
terraform plan -target=module.container_registry -out=tfplan   # read it
terraform apply tfplan
export REGISTRY=$(terraform output -raw registry_url) TAG=latest

# 4b. Build and push the images (from the repository root)
cd ../..
az acr login --name "${REGISTRY%%.*}"
docker compose build && docker compose push

# 4c. Deploy everything else
cd infrastructure/azure
terraform plan -out=tfplan                      # read it
terraform apply tfplan

# 5. Open the app (a https://...azurecontainerapps.io URL)
terraform output app_url
terraform output -raw pocketbase_admin_password
```

Like Cloud Run, the app scales to zero when idle, so the first request after a pause waits while PocketBase starts.
