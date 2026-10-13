import type { Context } from 'hono';

// ?lang=es|en estricto: cualquier otro valor es 400 (contrato predecible).
export function parseLang(c: Context): 'es' | 'en' | null {
  const raw = c.req.query('lang') ?? 'es';
  if (raw !== 'es' && raw !== 'en') return null;
  return raw;
}

export function langError(c: Context) {
  return c.json({ error: 'lang debe ser es o en' }, 400);
}
