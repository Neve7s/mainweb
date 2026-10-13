import * as fs from 'fs/promises';
import * as path from 'path';
import { beforeAll, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { adminCookie } from './helpers';

// PNG de 1px para las pruebas.
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

let cookie = '';

beforeAll(async () => {
  cookie = await adminCookie();
});

async function upload(filename: string, data: Buffer | Uint8Array, tipo = 'blog', mime = 'image/png') {
  const form = new FormData();
  form.append('file', new Blob([data as BlobPart], { type: mime }), filename);
  form.append('tipo', tipo);
  const res = await app.request('/api/upload', {
    method: 'POST',
    headers: { Cookie: cookie },
    body: form,
  });
  return { status: res.status, body: (await res.json()) as any };
}

function diskPath(url: string): string {
  return path.join('uploads', url.replace('/uploads/', ''));
}

describe('POST /api/upload (driver local)', () => {
  it('sin cookie → 401', async () => {
    const form = new FormData();
    form.append('file', new Blob([PNG_1PX], { type: 'image/png' }), 'x.png');
    const res = await app.request('/api/upload', { method: 'POST', body: form });
    expect(res.status).toBe(401);
  });

  it('png válido → 201, url local y archivo en disco', async () => {
    const { status, body } = await upload('test.png', PNG_1PX, 'blog');
    expect(status).toBe(201);
    expect(body.url).toMatch(/^\/uploads\/blog\/.+\.png$/);
    expect(body.public_id).toBeNull();
    await fs.access(diskPath(body.url)); // existe
    await fs.unlink(diskPath(body.url)); // limpieza
  });

  it('.exe → 400 y no escribe nada', async () => {
    const { status } = await upload('mal.exe', Buffer.from('MZ'), 'blog', 'application/octet-stream');
    expect(status).toBe(400);
  });

  it('>8MB → 400', async () => {
    const big = Buffer.alloc(9 * 1024 * 1024, 0);
    const { status } = await upload('grande.png', big, 'blog');
    expect(status).toBe(400);
  });

  it('tipo inválido cae a misc', async () => {
    const { status, body } = await upload('test.png', PNG_1PX, 'noexiste');
    expect(status).toBe(201);
    expect(body.url).toMatch(/^\/uploads\/misc\//);
    await fs.unlink(diskPath(body.url));
  });
});
