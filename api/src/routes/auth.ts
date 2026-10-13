import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { allowedEmails, users } from '../db/schema';
import { signToken, verifyCredentials, verifyToken } from '../lib/auth';

export const authRoutes = new Hono();

const Login = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(200),
});

function cookieOpts() {
  const secure =
    (process.env.PUBLIC_SITE_URL || '').startsWith('https://') ||
    process.env.NODE_ENV === 'production';
  return { httpOnly: true, path: '/', sameSite: 'Lax' as const, secure, maxAge: 12 * 3600 };
}

authRoutes.post('/auth/login', async (c) => {
  let json: unknown;
  try {
    json = await c.req.json();
  } catch {
    return c.json({ error: 'JSON inválido' }, 400);
  }
  const p = Login.safeParse(json);
  if (!p.success) return c.json({ error: 'Credenciales inválidas' }, 401);
  const u = await verifyCredentials(p.data.email, p.data.password);
  if (!u) return c.json({ error: 'Credenciales inválidas' }, 401);
  setCookie(c, 'token', await signToken(u), cookieOpts());
  return c.json({ ok: true, email: u.email });
});

const Register = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(200),
});

// Anti-abuso del registro: 5 intentos por IP cada 10 min.
const REG_LIMIT = 5;
const REG_WINDOW_MS = 10 * 60_000;
const regHits = new Map<string, number[]>();

function clientIp(c: any): string {
  return (
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    c.req.header('cf-connecting-ip') ||
    'unknown'
  );
}

// Registro restringido: solo correos en allowed_emails, sin duplicados.
// Crea el usuario y deja la sesión iniciada (cookie JWT) automáticamente.
authRoutes.post('/auth/register', async (c) => {
  const ip = clientIp(c);
  const now = Date.now();
  const arr = (regHits.get(ip) || []).filter((t) => now - t < REG_WINDOW_MS);
  if (arr.length >= REG_LIMIT) {
    return c.json({ error: 'Demasiados intentos, espera unos minutos' }, 429);
  }
  arr.push(now);
  regHits.set(ip, arr);

  let json: unknown;
  try {
    json = await c.req.json();
  } catch {
    return c.json({ error: 'JSON inválido' }, 400);
  }
  const p = Register.safeParse(json);
  if (!p.success) {
    return c.json({ error: 'Email inválido o contraseña muy corta (mínimo 8)' }, 400);
  }
  const email = p.data.email.toLowerCase();
  const allowed = await db
    .select()
    .from(allowedEmails)
    .where(eq(allowedEmails.email, email));
  if (!allowed[0]) {
    return c.json({ error: 'Este correo no está autorizado para registrarse' }, 403);
  }
  const existing = await db.select().from(users).where(eq(users.email, email));
  if (existing[0]) {
    return c.json({ error: 'Este correo ya está registrado, inicia sesión' }, 409);
  }
  try {
    const passwordHash = await bcrypt.hash(p.data.password, 12);
    const [u] = await db.insert(users).values({ email, passwordHash }).returning();
    setCookie(c, 'token', await signToken(u), cookieOpts());
    return c.json({ ok: true, email: u.email }, 201);
  } catch (e) {
    if (typeof e === 'object' && e !== null && (e as { code?: string }).code === '23505') {
      return c.json({ error: 'Este correo ya está registrado, inicia sesión' }, 409);
    }
    throw e;
  }
});

authRoutes.post('/auth/logout', (c) => {
  deleteCookie(c, 'token', { path: '/' });
  return c.json({ ok: true });
});

authRoutes.get('/auth/me', async (c) => {
  const token = getCookie(c, 'token');
  if (!token) return c.json({ error: 'No autorizado' }, 401);
  try {
    const payload = await verifyToken(token);
    return c.json({ ok: true, email: payload.email });
  } catch {
    return c.json({ error: 'Sesión inválida' }, 401);
  }
});
