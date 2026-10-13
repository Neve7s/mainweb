import { Hono } from 'hono';
import { requireAdmin } from '../lib/auth';
import { saveUpload, validateUpload } from '../lib/storage';

export const uploadRoutes = new Hono();
// Mismo motivo que en admin.ts: path explícito para no afectar rutas hermanas.
uploadRoutes.use('/upload/*', requireAdmin);

uploadRoutes.post('/upload', async (c) => {
  let form: Record<string, string | File>;
  try {
    form = await c.req.parseBody();
  } catch {
    return c.json({ error: 'Multipart inválido' }, 400);
  }
  const file = form['file'];
  if (!(file instanceof File)) return c.json({ error: 'Falta el archivo (file)' }, 400);
  const v = validateUpload(form['tipo'], file.name || 'upload', file.size);
  if ('error' in v) return c.json({ error: v.error }, 400);
  try {
    const stored = await saveUpload(v.tipo, v.ext, new Uint8Array(await file.arrayBuffer()));
    return c.json({ ok: true, ...stored }, 201);
  } catch (e) {
    console.error('[upload]', e);
    return c.json({ error: 'No se pudo guardar el archivo' }, 500);
  }
});
