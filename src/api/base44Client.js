import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: "685f99cef99eb124cb651cdd", 
  requiresAuth: true // Ensure authentication is required for all operations
});
