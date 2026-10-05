import express from 'express';
import { loadConfig } from './config.js';
import { createApp } from './app.js';
import { sendData } from './lib/respond.js';

const config = loadConfig();
const app = createApp(config);
const servers = [app.listen(config.port)];

// When HEALTHCHECK_PORT differs from PORT, answer the liveness check on that
// port too (and nothing else), e.g. for a load balancer that checks a separate port.
if (config.healthcheck.port !== config.port) {
  const health = express();
  health.get(config.healthcheck.path, (_req, res) => sendData(res, { status: 'ok' }));
  servers.push(health.listen(config.healthcheck.port));
}

console.log(JSON.stringify({
  message: 'nutrition-api started',
  port: config.port,
  healthcheck: `:${config.healthcheck.port}${config.healthcheck.path}`,
  pocketbase: config.pocketbaseUrl,
}));

// ECS sends SIGTERM before stopping a task: finish in-flight requests, then exit.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    console.log(JSON.stringify({ message: `${signal} received, shutting down` }));
    let open = servers.length;
    for (const server of servers) server.close(() => --open === 0 && process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  });
}
