import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import { checkDb } from './db/client';
import { adminRoutes } from './routes/admin';
import { allowedRoutes } from './routes/allowed';
import { authRoutes } from './routes/auth';
import { chatRoutes } from './routes/chat';
import { uploadRoutes } from './routes/upload';
import { contactRoutes } from './routes/contact';
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
app.route('/api', contactRoutes);
app.route('/api', authRoutes);
app.route('/api/admin', allowedRoutes);
app.route('/api', adminRoutes);
app.route('/api', uploadRoutes);
app.route('/api', chatRoutes);

// En dev (driver local) la API sirve los uploads. En prod los sirve Cloudinary.
if ((process.env.STORAGE_DRIVER || 'local') === 'local') {
  app.use('/uploads/*', serveStatic({ root: './' }));
}

app.notFound((c) => c.json({ error: 'Not found' }, 404));
app.onError((err, c) => {
  console.error('[api]', err);
  return c.json({ error: 'Internal error' }, 500);
});
