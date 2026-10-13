import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { app } from '../src/app';
import { db } from '../src/db/client';
import { allowedEmails, users } from '../src/db/schema';
import { adminCookie, api } from './helpers';

const EMAIL = 'nuevo-dev-hieyson@example.com';

let cookie = '';

beforeAll(async () => {
  cookie = await adminCookie();
  await db.delete(users).where(eq(users.email, EMAIL));
  await db.delete(allowedEmails).where(eq(allowedEmails.email, EMAIL));
});

afterAll(async () => {
  await db.delete(users).where(eq(users.email, EMAIL));
  await db.delete(allowedEmails).where(eq(allowedEmails.email, EMAIL));
});

async function register(body: unknown) {
  const res = await app.request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const setCookie = res.headers.get('set-cookie') ?? '';
  const token = setCookie.match(/token=([^;]+)/)?.[1] ?? '';
  return { status: res.status, token, body: (await res.json()) as any };
}

describe('registro restringido', () => {
  it('403 si el correo no está permitido', async () => {
    const r = await register({ email: EMAIL, password: 'Secreta01' });
    expect(r.status).toBe(403);
  });

  it('400 con contraseña corta', async () => {
    await api('/api/admin/allowed-emails', cookie, 'POST', { email: EMAIL });
    const r = await register({ email: EMAIL, password: 'corta' });
    expect(r.status).toBe(400);
  });

  it('admin agrega correo; duplicado → 409', async () => {
    const dup = await api('/api/admin/allowed-emails', cookie, 'POST', { email: EMAIL });
    expect(dup.status).toBe(409);
    const list = await api('/api/admin/allowed-emails', cookie);
    expect((list.body as any[]).some((x) => x.email === EMAIL)).toBe(true);
  });

  it('registro crea usuario + JWT automático; duplicado → 409', async () => {
    const r = await register({ email: EMAIL, password: 'Secreta01' });
    expect(r.status).toBe(201);
    expect(r.token.length).toBeGreaterThan(20);
    const me = await app.request('/api/auth/me', {
      headers: { Cookie: `token=${r.token}` },
    });
    expect(me.status).toBe(200);
    const dup = await register({ email: EMAIL, password: 'Otraclave02' });
    expect(dup.status).toBe(409);
  });
});
