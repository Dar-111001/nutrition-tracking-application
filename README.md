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

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Tailwind CSS, shadcn/ui |
| Database | PocketBase (self-hosted NoSQL) |
| Server | nginx (serves the built React app) |
| Runtime | Docker + Docker Compose |

---

## Folder Structure

```
.
├── src/
│   ├── api/
│   │   ├── pocketbaseClient.js   # PocketBase connection (URL from env)
│   │   ├── localStore.js         # list/create/update/delete wrapper
│   │   ├── entities.js           # Food, DailyGoals, FoodItem exports
│   │   └── integrations.js       # AI/upload stubs (not yet configured)
│   ├── components/
│   │   └── nutrition/            # FoodForm, FoodList, DailyProgress, QuickAddFoodDialog
│   ├── pages/
│   │   ├── Home.jsx              # Daily journal
│   │   ├── FoodLibrary.jsx       # Food library (per-100g reference items)
│   │   ├── MonthlyTracker.jsx    # Monthly overview
│   │   ├── Layout.jsx            # Nav + page shell
│   │   └── index.jsx             # Router
│   └── main.jsx
├── Dockerfile                    # Multi-stage: Node build → nginx serve
├── Dockerfile.pocketbase         # PocketBase container with auto-setup
├── docker-compose.yml            # Runs app + pocketbase together
├── nginx.conf                    # SPA routing (all paths → index.html)
├── pb_setup.sh                   # Creates admin + collections on first run
├── .env.example                  # Template for required credentials
└── .env                          # Your local credentials (gitignored)
```

---

## Running Locally with Docker

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### 1. Clone the repo

```bash
git clone https://github.com/Dar-111001/nutrition-tracking-application.git
cd nutrition-tracking-application
```

### 2. Create your `.env` file

```bash
cp .env.example .env
```

Open `.env` and set your admin credentials:

```
PB_ADMIN_EMAIL=admin@nutrition.local
PB_ADMIN_PASSWORD=YourPasswordHere
```

### 3. Start the app

```bash
docker compose up --build
```

First run takes 2–3 minutes (downloads Node, nginx, PocketBase, installs packages, builds).

On startup, PocketBase automatically:
- Creates the admin account from your `.env`
- Creates the `food`, `daily_goals`, and `food_items` collections with open API rules

### 4. Open the app

| Service | URL |
|---------|-----|
| App | http://localhost:3000 |
| PocketBase admin UI | http://localhost:8090/_/ |

---

## Stopping and Restarting

```bash
# Stop (keeps all data)
docker compose down

# Restart (no rebuild needed)
docker compose up

# Rebuild after code changes
docker compose up --build

# Full reset — wipes the database
docker compose down -v && docker compose up --build
```

---

## Database

Data is stored in a Docker volume (`pocketbase_data`) and survives container restarts.

### Collections

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `food` | Daily food log entries | name, protein_grams, carbs_grams, fat_grams, date |
| `daily_goals` | User's daily macro targets | protein_goal, carbs_goal, fat_goal |
| `food_items` | Food library (per 100g reference) | name, protein_per_100g, carbs_per_100g, fat_per_100g |

You can view and edit data directly in the PocketBase admin UI at http://localhost:8090/_/

### Changing the database URL

The PocketBase URL is baked into the frontend at build time via `VITE_POCKETBASE_URL` in `docker-compose.yml`. To point to a different server (e.g. for cloud deployment), update that value and rebuild:

```bash
docker compose up --build
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PB_ADMIN_EMAIL` | PocketBase admin email (set in `.env`) |
| `PB_ADMIN_PASSWORD` | PocketBase admin password (set in `.env`) |
| `VITE_POCKETBASE_URL` | PocketBase URL baked into the frontend at build time (default: `http://localhost:8090`) |

`.env` is gitignored — never commit it. Use `.env.example` as the template.
