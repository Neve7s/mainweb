import { describe, expect, it } from 'vitest';
import { app } from '../src/app';

const EMAIL = process.env.ADMIN_EMAIL!;
const PASSWORD = process.env.ADMIN_PASSWORD!;

async function login(email: string, password: string) {
  const res = await app.request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const setCookie = res.headers.get('set-cookie') ?? '';
  const token = setCookie.match(/token=([^;]+)/)?.[1] ?? '';
  return { status: res.status, token, body: (await res.json()) as any };
}

describe('auth admin', () => {
  it('login malo → 401 sin cookie', async () => {
    const r = await login(EMAIL, 'clave-incorrecta');
    expect(r.status).toBe(401);
    expect(r.token).toBe('');
  });

  it('login bueno → 200 + cookie httpOnly', async () => {
    const r = await login(EMAIL, PASSWORD);
    expect(r.status).toBe(200);
    expect(r.body.email).toBe(EMAIL);
    expect(r.token.length).toBeGreaterThan(20);
  });

  it('me sin cookie → 401, con cookie → 200', async () => {
    const anon = await app.request('/api/auth/me');
    expect(anon.status).toBe(401);
    const { token } = await login(EMAIL, PASSWORD);
    const me = await app.request('/api/auth/me', {
      headers: { Cookie: `token=${token}` },
    });
    expect(me.status).toBe(200);
  });

  it('cookie inválida → 401', async () => {
    const res = await app.request('/api/auth/me', {
      headers: { Cookie: 'token=invalida' },
    });
    expect(res.status).toBe(401);
  });

  it('logout limpia la cookie', async () => {
    const { token } = await login(EMAIL, PASSWORD);
    const res = await app.request('/api/auth/logout', {
      method: 'POST',
      headers: { Cookie: `token=${token}` },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('set-cookie') ?? '').toMatch(/token=;/);
  });
});
