import { serve } from '@hono/node-server';
import { app } from './app';

const port = Number(process.env.PORT || 3001);
serve({ fetch: app.fetch, port });
// eslint-disable-next-line no-console
console.log(`[api] listening on :${port} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
