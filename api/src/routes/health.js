import { Router } from 'express';
import { sendData, sendError, route } from '../lib/respond.js';
import { ApiError } from '../lib/apiError.js';

// Two checks, the usual split for containers:
//   liveness  (HEALTHCHECK_PATH, default /api/health): is this process up? Used by the
//             container health check, so ECS restarts the API only when the API itself is broken.
//   readiness (/api/ready): can we reach PocketBase? Used by nginx's /health, so the
//             load balancer stops sending traffic while the database is down.
export function healthRoutes({ healthcheckPath, pocketbase }) {
  const router = Router();
  const startedAt = Date.now();

  router.get(healthcheckPath, (_req, res) => {
    sendData(res, { status: 'ok', uptimeSeconds: Math.round((Date.now() - startedAt) / 1000) });
  });

  router.get('/api/ready', route(async (_req, res) => {
    try {
      await pocketbase.health();
      sendData(res, { status: 'ready', database: 'up' });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'The database health check failed.';
      // 503 tells load balancers "temporarily unavailable"
      sendError(res, new ApiError('server', message, { database: 'down' }), 503);
    }
  }));

  return router;
}
