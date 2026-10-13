import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { z } from 'zod';
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
