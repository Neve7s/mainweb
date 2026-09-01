import servicesData from '../../src/data/services.json';
import siteData from '../../src/data/site.json';
import proyectos from '../../src/data/jsons/Proyectos.json';
import proyectosEn from '../../src/data/jsons/Proyectos_en.json';

const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

const DEFAULT_MODELS = [
  'nvidia/llama-3.3-nemotron-super-49b-v1',
  'nvidia/nemotron-mini-4b-instruct',
];
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;
const ipHits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const hits = (ipHits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_LIMIT) return true;
  hits.push(now);
  ipHits.set(ip, hits);
  return false;
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  });
}

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
  };
}

function buildKnowledge(lang) {
  const services = lang === 'en' ? servicesData.en : servicesData.es;
  const projs = lang === 'en' ? proyectosEn.proyectos : proyectos.proyectos;

  const contact = siteData.contact;
  const social = siteData.social || {};
  const langLabel = lang === 'en' ? 'English' : 'Spanish';

  const persona = `You are NOSYEIH, the sales assistant of HieysoN (hieyson.com), a software dev + AI company. Reply in ${langLabel}. Short and natural like WhatsApp, max 2-3 sentences. No lists or numbered things.`;

  const rules = `Rules:
- Services: ${services.map((s) => s.title).join(', ')}.
- We build in any technology: PHP, Python/Django, JavaScript, WordPress, etc. Never refuse a request.
- If they ask how something works in practice (equipment, offline, installation): answer briefly and honestly; if unsure, say the team can verify it and offer WhatsApp.
- Domain & hosting: if they have or ask about a domain, tell them we provide and manage it.
- For quotes or hiring: give WhatsApp link ${contact.whatsappUrl}, asking at most one question first.
- Never invent prices or dates.`;

  return [
    persona,
    rules,
    ``,
    `Our services (short names only): ${services
      .map((s) => `${s.title} (${s.category})`)
      .join(' | ')}`,
    ``,
    `Our projects (names only): ${projs
      .map((p) => `${p.titulo_listado} [${p.categoria}]`)
      .slice(0, 12)
      .join(' | ')}`,
    ``,
    `Contact: Email ${contact.email} | Phone ${contact.phoneDisplay} | WhatsApp ${contact.whatsappUrl}`,
  ].join('\n');
}

async function callNvidia(env, messages) {
  const apiKey = env.NVIDIA_API_KEY;
  if (!apiKey) {
    return { ok: false, status: 500, error: 'Missing NVIDIA_API_KEY secret' };
  }

  const extraModels = (env.NVIDIA_MODELS || '')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
  const modelList = [DEFAULT_MODELS[0], ...extraModels, DEFAULT_MODELS[1]].filter(
    (m, i, a) => a.indexOf(m) === i
  );

  for (const model of modelList) {
    try {
      const res = await fetch(NVIDIA_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.7,
          max_tokens: 300,
          stream: false,
        }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        // 401/403 = bad API key -> no point retrying other models
        if (res.status === 401 || res.status === 403) {
          const body = await res.text().catch(() => '');
          return { ok: false, status: res.status, error: body.slice(0, 300) };
        }
        // 429/410/404/5xx -> model unavailable/quota -> try next model
        if (model !== modelList[modelList.length - 1]) continue;
        const body = await res.text().catch(() => '');
        return { ok: false, status: res.status, error: body.slice(0, 300) };
      }

      const data = await res.json();
      const reply = data?.choices?.[0]?.message?.content?.trim();
      if (!reply) return { ok: false, status: 502, error: 'Empty response from model' };
      return { ok: true, reply };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      const isLast = model === modelList[modelList.length - 1];
      if (!isLast && (msg.includes('timed out') || msg.includes('Timeout') || msg.includes('fetch failed'))) continue;
      if (!isLast) continue;
      return { ok: false, status: 502, error: msg };
    }
  }
  return { ok: false, status: 429, error: 'All models are out of quota. Try again in a moment.' };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const headers = cors();

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    if (request.method === 'GET' && url.pathname === '/health') {
      return json({ ok: true }, 200, headers);
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, headers);
    }

    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    if (rateLimited(ip)) {
      return json({ error: 'Too many requests. Please wait a minute.' }, 429, headers);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400, headers);
    }

    const lang = body.lang === 'en' ? 'en' : 'es';
    const messages = Array.isArray(body.messages) ? body.messages : [];

    if (messages.length === 0 || messages.length > 20) {
      return json({ error: 'messages must be an array of 1-20 items' }, 400, headers);
    }

    const sanitized = [];
    for (const m of messages) {
      if (typeof m !== 'object' || m === null) continue;
      const role = m.role === 'assistant' ? 'assistant' : 'user';
      const content = typeof m.content === 'string' ? m.content.trim().slice(0, 600) : '';
      if (!content) continue;
      sanitized.push({ role, content });
    }
    if (sanitized.length === 0) {
      return json({ error: 'No valid messages' }, 400, headers);
    }

    const systemPrompt = buildKnowledge(lang);
    const result = await callNvidia(env, [{ role: 'system', content: systemPrompt }, ...sanitized]);

    if (!result.ok) {
      return json({ error: result.error }, result.status, headers);
    }
    return json({ reply: result.reply }, 200, headers);
  },
};