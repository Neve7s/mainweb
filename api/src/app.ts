import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { checkDb } from './db/client';
import { publicRoutes } from './routes/public';

export const app = new Hono();

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

app.route('/api', publicRoutes);

app.notFound((c) => c.json({ error: 'Not found' }, 404));
app.onError((err, c) => {
  console.error('[api]', err);
  return c.json({ error: 'Internal error' }, 500);
});
