// Container health check (Docker HEALTHCHECK or the ECS healthCheck command).
// Uses the same env vars as the server, so they can never disagree.
import { loadConfig } from './src/config.js';

const { healthcheck } = loadConfig();
try {
  const res = await fetch(`http://127.0.0.1:${healthcheck.port}${healthcheck.path}`, {
    signal: AbortSignal.timeout(3000),
  });
  process.exit(res.ok ? 0 : 1);
} catch {
  process.exit(1);
}
