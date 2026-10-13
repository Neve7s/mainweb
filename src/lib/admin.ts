import type { APIContext } from 'astro';

// Helpers server-side del /admin: hablan con la API por red interna (API_URL)
// reenviando la cookie httpOnly `token`. Nada secreto llega al navegador.

const API = import.meta.env.API_URL || 'http://localhost:3001';

export async function apiFetch(Astro: APIContext, path: string, init: RequestInit = {}) {
  const token = Astro.cookies.get('token')?.value;
  const headers = new Headers(init.headers);
  if (token) headers.set('Cookie', `token=${token}`);
  return fetch(`${API}${path}`, { ...init, headers });
}

// null si no hay sesión válida.
export async function requireAdmin(Astro: APIContext): Promise<{ email?: string } | null> {
  try {
    const r = await apiFetch(Astro, '/api/auth/me');
    if (!r.ok) return null;
    return (await r.json()) as { email?: string };
  } catch {
    return null;
  }
}

export function setTokenCookie(Astro: APIContext, token: string) {
  Astro.cookies.set('token', token, {
    httpOnly: true,
    path: '/',
    maxAge: 12 * 3600,
    sameSite: 'lax',
    secure: import.meta.env.PROD,
  });
}

// Sube un archivo a la API (multipart) reenviando la sesión. Retorna {url, public_id}.
export async function uploadViaApi(
  Astro: APIContext,
  tipo: string,
  file: File,
): Promise<{ url: string; public_id: string | null }> {
  const form = new FormData();
  form.append('file', file, (file as any).name ?? 'upload');
  form.append('tipo', tipo);
  const r = await apiFetch(Astro, '/api/upload', { method: 'POST', body: form });
  if (r.status !== 201) throw new Error(`upload falló (${r.status})`);
  return (await r.json()) as { url: string; public_id: string | null };
}

export const inputCls =
  'w-full bg-transparent border border-light-border dark:border-dark-border px-4 py-3 text-sm font-mono text-light-accent dark:text-white placeholder:text-light-muted dark:placeholder:text-dark-muted focus:outline-none focus:border-light-accent dark:focus:border-white transition-colors';

export const btnCls =
  'inline-flex items-center justify-center gap-2 text-xs font-mono uppercase tracking-[0.15em] border border-light-border dark:border-dark-border px-6 py-3 text-light-accent dark:text-white hover:bg-light-accent hover:text-light-900 dark:hover:bg-white dark:hover:text-black transition-all no-underline';

export const btnPrimaryCls =
  'inline-flex items-center justify-center gap-2 text-xs font-mono uppercase tracking-[0.15em] bg-light-accent text-light-900 dark:bg-white dark:text-black px-6 py-3 hover:opacity-90 transition-opacity no-underline';
