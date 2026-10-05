import { Router } from 'express';
import { sendData, route } from '../lib/respond.js';
import { requireText } from '../lib/validate.js';
import { requireAuth } from '../lib/auth.js';
import { ApiError } from '../lib/apiError.js';

const USERS = 'users';

// Login is delegated to PocketBase's users collection. The API stays stateless:
// it hands the browser PocketBase's signed token and keeps nothing in memory.
export function authRoutes({ pocketbase }) {
  const router = Router();

  router.post('/login', route(async (req, res) => {
    const email = requireText(req.body.email, 'email');
    const password = requireText(req.body.password, 'password', { max: 500 });
    try {
      const result = await pocketbase.login(USERS, email, password);
      sendData(res, toSession(result));
    } catch (err) {
      // PocketBase answers 400 for a wrong email or password
      if (err.code === 'validation') {
        throw new ApiError('unauthorized', 'Wrong email or password.', { field: 'password' });
      }
      throw err;
    }
  }));

  // Swaps a still-valid token for a fresh one (and proves it was not revoked)
  router.post('/refresh', requireAuth, route(async (req, res) => {
    const result = await pocketbase.refresh(USERS, req.token);
    sendData(res, toSession(result));
  }));

  return router;
}

const toSession = ({ token, record }) => ({
  token,
  user: { id: record.id, email: record.email },
});
