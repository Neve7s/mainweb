import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { allowedEmails } from '../db/schema';
import { requireAdmin } from '../lib/auth';

export const allowedRoutes = new Hono();
allowedRoutes.use('/allowed-emails/*', requireAdmin);

const EmailBody = z.object({ email: z.string().trim().email().max(254) });

allowedRoutes.get('/allowed-emails', async (c) => {
  const rows = await db.select().from(allowedEmails).orderBy(allowedEmails.email);
  return c.json(rows);
});

allowedRoutes.post('/allowed-emails', async (c) => {
  let json: unknown;
  try {
    json = await c.req.json();
  } catch {
    return c.json({ error: 'JSON inválido' }, 400);
  }
  const p = EmailBody.safeParse(json);
  if (!p.success) return c.json({ error: 'Email inválido' }, 400);
  const email = p.data.email.toLowerCase();
  try {
    const [row] = await db.insert(allowedEmails).values({ email }).returning();
    return c.json(row, 201);
  } catch (e) {
    if (typeof e === 'object' && e !== null && (e as { code?: string }).code === '23505') {
      return c.json({ error: 'Ese correo ya está permitido' }, 409);
    }
    throw e;
  }
});

allowedRoutes.delete('/allowed-emails/:email', async (c) => {
  const email = decodeURIComponent(c.req.param('email')).toLowerCase();
  const rows = await db
    .delete(allowedEmails)
    .where(eq(allowedEmails.email, email))
    .returning({ email: allowedEmails.email });
  if (!rows[0]) return c.json({ error: 'No encontrado' }, 404);
  return c.json({ ok: true });
});
