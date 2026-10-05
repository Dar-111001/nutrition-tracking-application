import PocketBase from 'pocketbase';

// Same-origin by default: nginx (or the Vite dev proxy) forwards /api to PocketBase,
// so one image works in every environment. VITE_POCKETBASE_URL is only an override.
const POCKETBASE_URL = import.meta.env.VITE_POCKETBASE_URL || '/';

export const pb = new PocketBase(POCKETBASE_URL);

// Disable auto-cancellation so rapid re-renders don't cancel requests
pb.autoCancellation(false);
