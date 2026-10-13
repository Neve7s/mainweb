import { describe, expect, it } from 'vitest';
import { eq, like } from 'drizzle-orm';
import { app } from '../src/app';
import { db } from '../src/db/client';
import { contactMessages } from '../src/db/schema';

const TEST_EMAIL = 'test-contact-hieyson@example.com';

async function cleanup() {
  await db.delete(contactMessages).where(eq(contactMessages.email, TEST_EMAIL));
  await db.delete(contactMessages).where(like(contactMessages.email, 'rl-%@example.com'));
}

async function post(body: unknown) {
  const res = await app.request('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as any };
}

describe('POST /api/contact', () => {
  it('guarda mensaje válido como new', async () => {
    await cleanup();
    const { status, body } = await post({
      name: 'Test',
      email: TEST_EMAIL,
      message: 'Hola, quiero cotizar',
      lang: 'es',
    });
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    const rows = await db
      .select()
      .from(contactMessages)
      .where(eq(contactMessages.email, TEST_EMAIL));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe('new');
    await cleanup();
  });

  it('honeypot lleno finge éxito sin guardar', async () => {
    await cleanup();
    const { status } = await post({
      name: 'Bot',
      email: TEST_EMAIL,
      message: 'spam',
      company: 'ACME',
    });
    expect(status).toBe(200);
    const rows = await db
      .select()
      .from(contactMessages)
      .where(eq(contactMessages.email, TEST_EMAIL));
    expect(rows).toHaveLength(0);
  });

  it('email inválido → 400', async () => {
    const { status } = await post({ name: 'T', email: 'no-es-email', message: 'x' });
    expect(status).toBe(400);
  });

  it('rate-limit: ráfaga → 429', async () => {
    await cleanup();
    let last = 200;
    for (let i = 0; i < 12; i++) {
      const r = await post({ name: 'RL', email: `rl-${i}@example.com`, message: 'x' });
      last = r.status;
    }
    expect(last).toBe(429);
    await cleanup();
  });
});
