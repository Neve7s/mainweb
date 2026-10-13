import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { checkDb } from './db/client';

const app = new Hono();

const corsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  '*',
  cors({
    origin: corsOrigins.length > 0 ? corsOrigins : '*',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
);

app.get('/health', async (c) => {
  const dbOk = await checkDb();
  return c.json({ ok: true, db: dbOk ? 'up' : 'down' }, dbOk ? 200 : 503);
});

app.notFound((c) => c.json({ error: 'Not found' }, 404));
app.onError((err, c) => {
  console.error('[api]', err);
  return c.json({ error: 'Internal error' }, 500);
});

const port = Number(process.env.PORT || 3001);
serve({ fetch: app.fetch, port });
// eslint-disable-next-line no-console
console.log(`[api] listening on :${port} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
