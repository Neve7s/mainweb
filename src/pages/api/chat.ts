import type { APIContext } from 'astro';

export const prerender = false;

// Proxy misma-origin hacia el backend: evita CORS y mantiene
// NVIDIA_API_KEY solo en el servidor (nunca llega al navegador).
export async function POST({ request }: APIContext) {
  const API = import.meta.env.API_URL || 'http://localhost:3001';
  let body = '';
  try {
    body = await request.text();
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 });
  }
  try {
    const r = await fetch(`${API}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(30_000),
    });
    const data = await r.text();
    return new Response(data, {
      status: r.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return Response.json({ error: 'Chat no disponible, intenta de nuevo' }, { status: 502 });
  }
}
