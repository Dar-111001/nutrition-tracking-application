// Every setting comes from an environment variable, so the same image runs
// unchanged in docker compose and on ECS. Defaults suit docker compose.

function intFromEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer (got "${raw}")`);
  }
  return value;
}

// HEALTHCHECK_URL (e.g. http://localhost:4001/healthz) sets both the port and
// the path; otherwise HEALTHCHECK_PORT and HEALTHCHECK_PATH are used.
function healthcheckFromEnv(appPort) {
  let port = intFromEnv('HEALTHCHECK_PORT', appPort);
  let path = process.env.HEALTHCHECK_PATH || '/api/health';

  if (process.env.HEALTHCHECK_URL) {
    const url = new URL(process.env.HEALTHCHECK_URL);
    path = url.pathname;
    if (url.port) port = Number(url.port);
  }
  if (!path.startsWith('/')) {
    throw new Error(`HEALTHCHECK_PATH must start with / (got "${path}")`);
  }
  return { port, path };
}

export function loadConfig() {
  const port = intFromEnv('PORT', 4000);
  return {
    port,
    healthcheck: healthcheckFromEnv(port),
    pocketbaseUrl: (process.env.POCKETBASE_URL || 'http://pocketbase:8090').replace(/\/+$/, ''),
    openFoodFactsUrl: (process.env.OPENFOODFACTS_URL || 'https://world.openfoodfacts.org').replace(/\/+$/, ''),
    // How long we wait for PocketBase and OpenFoodFacts before giving up
    upstreamTimeoutMs: intFromEnv('UPSTREAM_TIMEOUT_MS', 5000),
    foodSearchTimeoutMs: intFromEnv('FOOD_SEARCH_TIMEOUT_MS', 8000),
  };
}
