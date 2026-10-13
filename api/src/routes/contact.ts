import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/client';
import { contactMessages } from '../db/schema';

export const contactRoutes = new Hono();

const Body = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  message: z.string().trim().min(1).max(2000),
  lang: z.enum(['es', 'en']).default('es'),
  source: z.string().trim().max(40).default('footer'),
  // Honeypot anti-spam: los humanos lo dejan vacío, los bots lo llenan.
  company: z.string().max(120).optional().default(''),
});

const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

function limited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (arr.length >= RATE_LIMIT) return true;
  arr.push(now);
  hits.set(ip, arr);
  return false;
}

contactRoutes.post('/contact', async (c) => {
  const ip =
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    c.req.header('cf-connecting-ip') ||
    'unknown';
  if (limited(ip)) {
    return c.json({ error: 'Demasiados intentos, espera un minuto' }, 429);
  }
  let json: unknown;
  try {
    json = await c.req.json();
  } catch {
    return c.json({ error: 'JSON inválido' }, 400);
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return c.json({ error: 'Datos inválidos' }, 400);
  }
  const { company, ...data } = parsed.data;
  if (company) return c.json({ ok: true }); // bot: finge éxito sin guardar
  await db.insert(contactMessages).values(data);
  return c.json({ ok: true });
});
