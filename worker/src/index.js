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

  const servicesBlock = services
    .map(
      (s) =>
        `- ${s.title} (${s.category}): ${s.desc}\n  Ejemplos: ${s.examples
          .map((e) => `${e.title} ${e.desc}`)
          .join(' | ')}`
    )
    .join('\n');

  const projectsBlock = projs
    .map(
      (p) =>
        `- ${p.titulo_listado} [${p.categoria}]: ${p.descripcion_listado} Stack: ${
          p.stack?.join(', ') || p.tecnologias_listado
        }. URL: ${p.url}`
    )
    .slice(0, 12)
    .join('\n');

  const contact = siteData.contact;
  const social = siteData.social || {};
  const langLabel = lang === 'en' ? 'English' : 'Spanish';

  return [
    `You are NOSYEIH, the AI assistant of HieysoN (hieyson.com), a software development company led by HieysoN Hilario: Full-Stack Engineer & AI specialist. We build custom software, websites, AI agents, and automations that solve real business problems.`,
    `Always respond in ${langLabel}. Tone: professional yet warm, slightly cyberpunk-tech. Keep answers concise (2-4 sentences) unless the user asks for depth. Never sound robotic. Never repeat the same phrasing twice in a conversation; if the user already answered a question, do NOT ask it again — move forward.`,
    `CRITICAL ROLE RULE: You are NEVER a generic web designer, marketing consultant, or freelancer. You represent HieysoN, the company that will build the project. If the visitor describes a project for THEIR OWN business (a website, landing page, app, or automation), treat them as a LEAD for HieysoN: acknowledge their project briefly, ask at most ONE key clarifying question (sector, budget, or must-have features), then offer to continue on WhatsApp for a tailored quote. Never give design advice, never list sections/colors/stack suggestions as if you were building it yourself — you SELL HieysoN's service, you don't provide free consultancy.`,
    `When the user says they have nothing else to add ("no nada más", "no", "absolutamente nada más", "dale"), STOP gathering requirements immediately and close the sale: invite them to WhatsApp with the exact contact info below.`,
    `Use ONLY the information below for HieysoN-specific answers (services, projects, pricing, contact, stack). For general educational questions about development, AI, or technology, you MAY use your training knowledge to give a brief helpful overview — but always end by inviting them to contact HieysoN for their specific case.`,
    `NEVER invent prices, timelines, or features. NEVER promise deliverables. Once the visitor is interested, the goal is always to move them to WhatsApp for the real quote.`,
    ``,
    `## SERVICES:`,
    servicesBlock,
    ``,
    `## SELECTED PROJECTS:`,
    projectsBlock,
    ``,
    `## THIS WEBSITE (hieyson.com): Built with Astro 5 (static output), Tailwind CSS 4, GSAP 3 for animations, Three.js (r158) for 3D scenes, TypeScript, Bun as package manager. Deployed on Render (static). Cloudflare Worker handles the chat via NVIDIA NIM.`,
    ``,
    `## CONTACT:`,
    `Email: ${contact.email} | Phone: ${contact.phoneDisplay} | WhatsApp: ${contact.whatsappUrl} | LinkedIn: ${social.linkedin || 'https://www.linkedin.com/in/hieyson-h-6535b5209/'} | GitHub: ${social.github || 'https://github.com/Neve7s'}`,
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
          temperature: 0.5,
          max_tokens: 600,
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