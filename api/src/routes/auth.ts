import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { eq, sql } from 'drizzle-orm';
import { randomBytes, createHash } from 'node:crypto';
import { db } from '../db/client';
import { allowedEmails, passwordResets, siteSettings, users } from '../db/schema';
import { sendResetEmail } from '../lib/resend';
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

const Forgot = z.object({ email: z.string().trim().email().max(254) });
const Reset = z.object({
  token: z.string().min(10).max(200),
  password: z.string().min(8).max(200),
});

// Anti-abuso del "olvidé mi clave": 5 por IP cada 10 min.
const FORGOT_LIMIT = 5;
const FORGOT_WINDOW_MS = 10 * 60_000;
const forgotHits = new Map<string, number[]>();

function hashToken(t: string): string {
  return createHash('sha256').update(t).digest('hex');
}

// Siempre responde ok:true (no revela si el correo existe).
authRoutes.post('/auth/forgot', async (c) => {
  const ip = clientIp(c);
  const now = Date.now();
  const arr = (forgotHits.get(ip) || []).filter((t) => now - t < FORGOT_WINDOW_MS);
  if (arr.length >= FORGOT_LIMIT) {
    return c.json({ error: 'Demasiados intentos, espera unos minutos' }, 429);
  }
  arr.push(now);
  forgotHits.set(ip, arr);

  let json: unknown;
  try {
    json = await c.req.json();
  } catch {
    return c.json({ error: 'JSON inválido' }, 400);
  }
  const p = Forgot.safeParse(json);
  if (!p.success) return c.json({ error: 'Email inválido' }, 400);

  // Limpieza oportunista de tokens vencidos.
  await db.delete(passwordResets).where(sql`${passwordResets.expiresAt} < NOW()`);

  const email = p.data.email.toLowerCase();
  const existing = await db.select().from(users).where(eq(users.email, email));
  if (existing[0]) {
    const token = randomBytes(32).toString('hex');
    await db.insert(passwordResets).values({
      email,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 60 * 60_000),
    });
    const brandRows = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, 'brand'));
    const brandName = ((brandRows[0]?.value ?? {}) as { name?: string }).name;
    await sendResetEmail(email, token, brandName);
  }
  return c.json({ ok: true });
});

// Canjea el token (un solo uso): cambia la clave e inicia sesión.
authRoutes.post('/auth/reset', async (c) => {
  let json: unknown;
  try {
    json = await c.req.json();
  } catch {
    return c.json({ error: 'JSON inválido' }, 400);
  }
  const p = Reset.safeParse(json);
  if (!p.success) {
    return c.json({ error: 'Enlace inválido o contraseña muy corta (mínimo 8)' }, 400);
  }
  const rows = await db
    .select()
    .from(passwordResets)
    .where(eq(passwordResets.tokenHash, hashToken(p.data.token)));
  const row = rows[0];
  if (!row || row.expiresAt < new Date()) {
    if (row) await db.delete(passwordResets).where(eq(passwordResets.id, row.id));
    return c.json({ error: 'Enlace inválido o vencido, pide otro' }, 400);
  }
  const target = await db.select().from(users).where(eq(users.email, row.email));
  if (!target[0]) {
    await db.delete(passwordResets).where(eq(passwordResets.id, row.id));
    return c.json({ error: 'Enlace inválido o vencido, pide otro' }, 400);
  }
  const passwordHash = await bcrypt.hash(p.data.password, 12);
  await db.update(users).set({ passwordHash }).where(eq(users.id, target[0].id));
  await db.delete(passwordResets).where(eq(passwordResets.id, row.id));
  setCookie(c, 'token', await signToken(target[0]), cookieOpts());
  return c.json({ ok: true, email: target[0].email });
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
