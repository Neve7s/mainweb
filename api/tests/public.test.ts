import { describe, expect, it } from 'vitest';
import { app } from '../src/app';

// Tests de lectura contra la DB local con seed (solo GET, no mutan nada).
async function get(path: string) {
  const res = await app.request(path);
  const body = (await res.json()) as any;
  return { status: res.status, body };
}

describe('public API', () => {
  it('health con db up', async () => {
    const { status, body } = await get('/health');
    expect(status).toBe(200);
    expect(body.db).toBe('up');
  });

  it('services es: 4 con slug', async () => {
    const { status, body } = await get('/api/services?lang=es');
    expect(status).toBe(200);
    expect(body).toHaveLength(4);
    expect(body[0].slug).toBeTruthy();
  });

  it('services en traduce', async () => {
    const { body } = await get('/api/services?lang=en');
    expect(body[0].title).toMatch(/Custom|AI|Business|B2B/);
  });

  it('lang inválido → 400', async () => {
    const { status } = await get('/api/services?lang=xx');
    expect(status).toBe(400);
  });

  it('service detail + 404', async () => {
    const { status, body } = await get('/api/services/desarrollo-software-a-medida?lang=es');
    expect(status).toBe(200);
    expect(body.examples).toHaveLength(3);
    expect(body.cta_button).toBeTruthy();
    const nf = await get('/api/services/no-existe?lang=es');
    expect(nf.status).toBe(404);
  });

  it('projects: 4, destacados=3', async () => {
    const all = await get('/api/projects?lang=es');
    expect(all.body).toHaveLength(4);
    const dest = await get('/api/projects?lang=es&destacado=true');
    expect(dest.body).toHaveLength(3);
    expect(dest.body[0].cover).toMatch(/^\//);
  });

  it('project detail con galería + 404', async () => {
    const { status, body } = await get('/api/projects/logia-logistics?lang=es');
    expect(status).toBe(200);
    expect(body.galeria.length).toBeGreaterThanOrEqual(10);
    expect(body.logros.length).toBeGreaterThan(0);
    const nf = await get('/api/projects/no-existe?lang=es');
    expect(nf.status).toBe(404);
  });

  it('posts: type inválido → 400; blog/noticias vacíos', async () => {
    const bad = await get('/api/posts?type=x');
    expect(bad.status).toBe(400);
    const blog = await get('/api/blog?lang=es');
    expect(blog.body.items).toEqual([]);
    const not = await get('/api/noticias?lang=es');
    expect(not.body.items).toEqual([]);
    const nf = await get('/api/posts/no-existe?lang=es');
    expect(nf.status).toBe(404);
  });

  it('site-settings trae contact.email', async () => {
    const { body } = await get('/api/site-settings');
    expect(body.contact.email).toContain('@');
  });

  it('testimonials 2 y clients 3', async () => {
    const t = await get('/api/testimonials?lang=es');
    expect(t.body).toHaveLength(2);
    const cl = await get('/api/clients');
    expect(cl.body).toHaveLength(3);
  });
});
