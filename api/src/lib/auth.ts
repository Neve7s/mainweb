import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import bcrypt from 'bcryptjs';
import * as jose from 'jose';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { users } from '../db/schema';

function secret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) throw new Error('[auth] JWT_SECRET ausente o menor a 32 chars');
  return new TextEncoder().encode(s);
}

export async function signToken(user: { id: string; email: string }): Promise<string> {
  return new jose.SignJWT({ email: user.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(secret());
}

export async function verifyToken(token: string) {
  const { payload } = await jose.jwtVerify(token, secret());
  return payload as { sub?: string; email?: string };
}

// Middleware: exige cookie `token` válida. Guarda adminId en el contexto.
export async function requireAdmin(c: Context, next: Next) {
  const token = getCookie(c, 'token');
  if (!token) return c.json({ error: 'No autorizado' }, 401);
  try {
    const payload = await verifyToken(token);
    if (!payload.sub) return c.json({ error: 'No autorizado' }, 401);
    c.set('adminId', payload.sub);
    await next();
  } catch {
    return c.json({ error: 'Sesión inválida' }, 401);
  }
}

export async function verifyCredentials(email: string, password: string) {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()));
  const u = rows[0];
  if (!u) return null;
  const ok = await bcrypt.compare(password, u.passwordHash);
  return ok ? u : null;
}
