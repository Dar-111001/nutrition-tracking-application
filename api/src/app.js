import express from 'express';
import { createPocketBase } from './lib/pocketbase.js';
import { ApiError } from './lib/apiError.js';
import { sendError } from './lib/respond.js';
import { requireAuth } from './lib/auth.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { foodRoutes } from './routes/foods.js';
import { goalRoutes } from './routes/goals.js';
import { foodItemRoutes } from './routes/foodItems.js';
import { foodSearchRoutes } from './routes/foodSearch.js';

// Builds the Express app. Kept separate from server.js so tests can start it
// on a random port with a fake PocketBase.
export function createApp(config) {
  const pocketbase = createPocketBase(config);
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', true); // nginx / the load balancer sits in front
  app.use(logRequests);
  app.use(express.json({ limit: '1mb' }));

  // Public routes
  app.use(healthRoutes({ healthcheckPath: config.healthcheck.path, pocketbase }));
  app.use('/api/auth', authRoutes({ pocketbase }));

  // Everything below needs a signed-in user
  app.use('/api/foods', requireAuth, foodRoutes({ pocketbase }));
  app.use('/api/goals', requireAuth, goalRoutes({ pocketbase }));
  app.use('/api/food-items', requireAuth, foodItemRoutes({ pocketbase }));
  app.use('/api/food-search', requireAuth, foodSearchRoutes(config));

  // Unknown route, then the single error handler. Every failure leaves here
  // in the standard { ok: false, error } shape.
  app.use((req, _res, next) => next(new ApiError('not_found', `No route for ${req.method} ${req.path}.`)));
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.parse.failed') err = new ApiError('validation', 'The request body is not valid JSON.');
    if (err.type === 'entity.too.large') err = new ApiError('validation', 'The request body is too large.');
    if (!(err instanceof ApiError)) console.error(err);
    sendError(res, err);
  });

  return app;
}

// One JSON line per request on stdout: readable locally, searchable in CloudWatch Logs.
function logRequests(req, res, next) {
  const start = process.hrtime.bigint();
  const path = req.originalUrl.split('?')[0];
  res.on('finish', () => {
    if (path.endsWith('/health')) return; // health checks every few seconds are noise
    console.log(JSON.stringify({
      time: new Date().toISOString(),
      method: req.method,
      path,
      status: res.statusCode,
      ms: Number((process.hrtime.bigint() - start) / 1000000n),
    }));
  });
  next();
}
