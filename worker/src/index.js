import servicesData from '../../src/data/services.json';
import siteData from '../../src/data/site.json';
import proyectos from '../../src/data/jsons/Proyectos.json';
import proyectosEn from '../../src/data/jsons/Proyectos_en.json';

const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

const DEFAULT_MODELS = [
  'nvidia/nemotron-mini-4b-instruct',
  'nvidia/llama-3.3-nemotron-super-49b-v1',
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

  const persona = `You are NOSYEIH, the sales assistant of HieysoN (hieyson.com), a software dev + AI company. You are a warm, natural seller. Match the user's tone and depth: short chat if they're casual, detailed if they ask for detail. No menus with numbers or headings — just natural conversation.`;

  const rules = `Rules:
- Respond in ${langLabel}.
- Greeting: when someone says hi, greet back and offer 2-3 natural options, e.g. "¿Cómo te ayudo? Por ejemplo: cuéntame tu idea de proyecto, quieres una página web, un sistema o automatizar algo con IA". Keep it short.
- We build in ANY technology: PHP, Python/Django, JavaScript, WordPress, etc. Never say we can't build something — say yes and invite them to talk details.
- Domain & hosting: if they ask or mention it, tell them we handle and manage domain + hosting for them, and ask if they already have one. If they have one, no problem — we work on theirs.
- If they want a quote or to hire us: give the WhatsApp link to continue: ${contact.whatsappUrl}. Ask at most ONE question before that.
- Never invent prices or dates.
- Be flexible: answer questions directly, use your knowledge when useful, and naturally guide to WhatsApp when they show interest.`;

  return [
    persona,
    rules,
    ``,
    `Services: ${services
      .map((s) => `${s.title} (${s.category}): ${s.desc}`)
      .join(' | ')}`,
    ``,
    `Projects: ${projs
      .map(
        (p) =>
          `${p.titulo_listado} [${p.categoria}]: ${
            p.stack?.join(', ') || p.tecnologias_listado
          }`
      )
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

  const models = (env.NVIDIA_MODELS || '').split(',').map((m) => m.trim()).filter(Boolean);
  const modelList = models.length ? models : [env.NVIDIA_MODEL || DEFAULT_MODELS[0]];

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
        signal: AbortSignal.timeout(20_000),
      });

      if (!res.ok) {
        if (res.status === 429) continue;
        const body = await res.text().catch(() => '');
        return { ok: false, status: res.status, error: body.slice(0, 200) };
      }

      const data = await res.json();
      const reply = data?.choices?.[0]?.message?.content?.trim();
      if (!reply) return { ok: false, status: 502, error: 'Empty response from model' };
      return { ok: true, reply };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      if (msg.includes('timed out') || msg.includes('Timeout')) continue;
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