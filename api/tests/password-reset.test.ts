import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { app } from '../src/app';
import { db } from '../src/db/client';
import { passwordResets, users } from '../src/db/schema';

const EMAIL = 'reset-dev-hieyson@example.com';

// El código solo llama a fetch (Resend) si hay key; en tests usamos una dummy.
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 'test-key';

// Captura el email de Resend (link con el token) sin llamar a la API real.
const realFetch = globalThis.fetch;
let capturedHtml = '';

function stubResend() {
  capturedHtml = '';
  globalThis.fetch = (async (url: any, init: any) => {
    if (String(url).includes('api.resend.com')) {
      capturedHtml = JSON.parse(init.body).html as string;
      return new Response(JSON.stringify({ id: 'test-id' }), { status: 200 });
    }
    throw new Error('fetch inesperado: ' + String(url));
  }) as unknown as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('password reset (Resend)', () => {
  it('setup: crea usuario directo en DB', async () => {
    await db.delete(passwordResets).where(eq(passwordResets.email, EMAIL));
    await db.delete(users).where(eq(users.email, EMAIL));
    const passwordHash = await bcrypt.hash('ClaveVieja01', 12);
    await db.insert(users).values({ email: EMAIL, passwordHash });
  });

  it('forgot con correo inexistente responde ok sin filtrar', async () => {
    stubResend();
    const res = await app.request('/api/auth/forgot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nadie@example.com' }),
    });
    expect(res.status).toBe(200);
    expect(capturedHtml).toBe('');
    const rows = await db
      .select()
      .from(passwordResets)
      .where(eq(passwordResets.email, 'nadie@example.com'));
    expect(rows).toHaveLength(0);
  });

  it('forgot crea token + resetea con JWT automático; reuso → 400', async () => {
    stubResend();
    const f = await app.request('/api/auth/forgot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL }),
    });
    expect(f.status).toBe(200);
    const token = capturedHtml.match(/token=([a-f0-9]+)/)?.[1];
    expect(token?.length).toBeGreaterThan(20);

    const r = await app.request('/api/auth/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password: 'ClaveNueva02' }),
    });
    expect(r.status).toBe(200);
    const setCookie = r.headers.get('set-cookie') ?? '';
    expect(setCookie).toMatch(/token=.+/);

    // La clave nueva funciona en login.
    const login = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: 'ClaveNueva02' }),
    });
    expect(login.status).toBe(200);

    // Reusar el token falla (un solo uso).
    const reuse = await app.request('/api/auth/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password: 'OtraClave03' }),
    });
    expect(reuse.status).toBe(400);
  });

  it('token vencido → 400; token inválido → 400; clave corta → 400', async () => {
    stubResend();
    await app.request('/api/auth/forgot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL }),
    });
    const token = capturedHtml.match(/token=([a-f0-9]+)/)?.[1];
    // Vencerlo a mano en DB.
    const { createHash } = await import('node:crypto');
    const hash = createHash('sha256').update(token!).digest('hex');
    await db
      .update(passwordResets)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(passwordResets.tokenHash, hash));

    const expired = await app.request('/api/auth/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password: 'ClaveNueva04' }),
    });
    expect(expired.status).toBe(400);

    const invalid = await app.request('/api/auth/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'muertomuerto00', password: 'ClaveNueva04' }),
    });
    expect(invalid.status).toBe(400);

    const short = await app.request('/api/auth/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'muertomuerto00', password: 'corta' }),
    });
    expect(short.status).toBe(400);
  });

  it('cleanup', async () => {
    await db.delete(passwordResets).where(eq(passwordResets.email, EMAIL));
    await db.delete(users).where(eq(users.email, EMAIL));
  });
});
