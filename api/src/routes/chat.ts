import { Hono } from 'hono';
import { z } from 'zod';
import { buildKnowledge } from '../lib/knowledge';

export const chatRoutes = new Hono();

// Lógica portada de worker/src/index.js (Cloudflare) al backend:
// misma validación, mismo rate-limit, mismo fallback de modelos NVIDIA.
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const FALLBACK_MODEL = 'nvidia/nemotron-mini-4b-instruct';

const Body = z.object({
  messages: z
    .array(z.object({ role: z.string(), content: z.string() }))
    .min(1)
    .max(20),
  lang: z.enum(['es', 'en']).default('es'),
});

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

function modelList(): string[] {
  const def = process.env.NVIDIA_MODEL || 'nvidia/llama-3.3-nemotron-super-49b-v1';
  const extra = (process.env.NVIDIA_MODELS || '')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
  return [def, ...extra, FALLBACK_MODEL].filter((m, i, a) => a.indexOf(m) === i);
}

type NvidiaResult =
  | { ok: true; reply: string }
  | { ok: false; status: number; error: string };

async function callNvidia(
  messages: Array<{ role: string; content: string }>,
): Promise<NvidiaResult> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) return { ok: false, status: 500, error: 'Missing NVIDIA_API_KEY' };
  const models = modelList();
  for (const model of models) {
    const isLast = model === models[models.length - 1];
    try {
      const res = await fetch(NVIDIA_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 300, stream: false }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          const body = await res.text().catch(() => '');
          return { ok: false, status: res.status, error: body.slice(0, 300) };
        }
        if (!isLast) continue;
        const body = await res.text().catch(() => '');
        return { ok: false, status: res.status, error: body.slice(0, 300) };
      }
      const data = (await res.json()) as any;
      const reply = data?.choices?.[0]?.message?.content?.trim();
      if (!reply) return { ok: false, status: 502, error: 'Empty response from model' };
      return { ok: true, reply };
    } catch (err) {
      if (!isLast) continue;
      return { ok: false, status: 502, error: err instanceof Error ? err.message : 'Network error' };
    }
  }
  return { ok: false, status: 429, error: 'All models are out of quota. Try again in a moment.' };
}

chatRoutes.post('/chat', async (c) => {
  const ip =
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    c.req.header('cf-connecting-ip') ||
    'unknown';
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (arr.length >= RATE_LIMIT) {
    return c.json({ error: 'Too many requests. Please wait a minute.' }, 429);
  }
  arr.push(now);
  hits.set(ip, arr);

  let json: unknown;
  try {
    json = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }
  const p = Body.safeParse(json);
  if (!p.success) {
    return c.json({ error: 'messages must be an array of 1-20 items' }, 400);
  }
  const sanitized: Array<{ role: string; content: string }> = [];
  for (const m of p.data.messages) {
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    const content = m.content.trim().slice(0, 600);
    if (content) sanitized.push({ role, content });
  }
  if (!sanitized.length) return c.json({ error: 'No valid messages' }, 400);

  const systemPrompt = await buildKnowledge(p.data.lang);
  const result = await callNvidia([{ role: 'system', content: systemPrompt }, ...sanitized]);
  if (!result.ok) {
    const code = [400, 401, 403, 404, 429, 500, 502, 503].includes(result.status)
      ? result.status
      : 502;
    return c.json({ error: result.error }, code as 502);
  }
  return c.json({ reply: result.reply });
});
