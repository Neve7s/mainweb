import { afterEach, describe, expect, it } from 'vitest';
import { app } from '../src/app';

// Stub del fetch hacia NVIDIA (no llamar a la API real en tests).
const realFetch = globalThis.fetch;

function stubNvidia(reply: string) {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ choices: [{ message: { content: reply } }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as unknown as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

async function chat(body: unknown) {
  const res = await app.request('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as any };
}

describe('POST /api/chat', () => {
  it('responde con reply', async () => {
    stubNvidia('Hola, somos HieysoN');
    const { status, body } = await chat({
      messages: [{ role: 'user', content: 'Hola' }],
      lang: 'es',
    });
    expect(status).toBe(200);
    expect(body.reply).toContain('HieysoN');
  });

  it('body inválido → 400', async () => {
    stubNvidia('x');
    const { status } = await chat({ messages: [], lang: 'es' });
    expect(status).toBe(400);
  });

  it('sin NVIDIA_API_KEY → 500', async () => {
    const key = process.env.NVIDIA_API_KEY;
    delete process.env.NVIDIA_API_KEY;
    stubNvidia('x');
    try {
      const { status } = await chat({ messages: [{ role: 'user', content: 'Hola' }] });
      expect(status).toBe(500);
    } finally {
      process.env.NVIDIA_API_KEY = key;
    }
  });

  it('rate-limit: ráfaga → 429', async () => {
    stubNvidia('ok');
    let last = 200;
    for (let i = 0; i < 21; i++) {
      const r = await chat({ messages: [{ role: 'user', content: `m-${i}` }] });
      last = r.status;
    }
    expect(last).toBe(429);
  });
});
