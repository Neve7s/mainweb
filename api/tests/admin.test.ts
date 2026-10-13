import { beforeAll, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { adminCookie, api } from './helpers';

let cookie = '';

beforeAll(async () => {
  cookie = await adminCookie();
});

const svcDraft = {
  title_es: 'Servicio Test',
  title_en: 'Test Service',
  category_es: 'Test',
  category_en: 'Test',
  human_title_es: 'H',
  human_title_en: 'H',
  desc_es: 'd',
  desc_en: 'd',
};

describe('admin CRUD', () => {
  it('sin cookie → 401', async () => {
    const res = await app.request('/api/admin/services');
    expect(res.status).toBe(401);
    const post = await app.request('/api/admin/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(svcDraft),
    });
    expect(post.status).toBe(401);
  });

  it('services: crear borrador, no sale en público, editar, borrar', async () => {
    const created = await api('/api/admin/services', cookie, 'POST', {
      ...svcDraft,
      slug: 'test-svc-draft',
      published: false,
    });
    expect(created.status).toBe(201);
    const id = created.body.id as string;

    const pub = await app.request('/api/services/slug-no?lang=es');
    expect(pub.status).toBe(404);
    const pub2 = await app.request('/api/services/test-svc-draft?lang=es');
    expect(pub2.status).toBe(404); // borrador: invisible en público

    const upd = await api(`/api/admin/services/${id}`, cookie, 'PUT', { title_es: 'Servicio Test 2' });
    expect(upd.status).toBe(200);
    expect(upd.body.titleEs).toBe('Servicio Test 2');

    const del = await api(`/api/admin/services/${id}`, cookie, 'DELETE');
    expect(del.status).toBe(200);
  });

  it('services: slug duplicado → 409', async () => {
    const r = await api('/api/admin/services', cookie, 'POST', { ...svcDraft, slug: 's1' });
    expect(r.status).toBe(409);
  });

  it('posts: crear blog publicado aparece en /api/blog, luego borrar', async () => {
    const created = await api('/api/admin/posts', cookie, 'POST', {
      slug: 'test-post-blog',
      type: 'blog',
      title_es: 'Post test',
      title_en: 'Test post',
      excerpt_es: 'e',
      excerpt_en: 'e',
      content_md_es: '# hola',
      content_md_en: '# hi',
      imagenes: ['/uploads/blog/x.webp'],
      tags: ['test'],
      published: true,
    });
    expect(created.status).toBe(201);
    expect(created.body.publishedAt).toBeTruthy();
    const id = created.body.id as string;

    const blog = await app.request('/api/blog?lang=es');
    expect(blog.status).toBe(200);
    const items = (await blog.json()) as any;
    expect(items.items.some((i: any) => i.slug === 'test-post-blog')).toBe(true);
    const not = await app.request('/api/noticias?lang=es');
    const notItems = (await not.json()) as any;
    expect(notItems.items.some((i: any) => i.slug === 'test-post-blog')).toBe(false);

    const del = await api(`/api/admin/posts/${id}`, cookie, 'DELETE');
    expect(del.status).toBe(200);
  });

  it('posts: type inválido → 400', async () => {
    const r = await api('/api/admin/posts', cookie, 'POST', {
      type: 'video',
      title_es: 'x',
      title_en: 'x',
      excerpt_es: 'x',
      excerpt_en: 'x',
      content_md_es: 'x',
      content_md_en: 'x',
    });
    expect(r.status).toBe(400);
  });

  it('messages: crear por canal público, listar, marcar, borrar', async () => {
    await app.request('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Admin Test',
        email: 'admintest-hieyson@example.com',
        message: 'probando bandeja',
      }),
    });
    const list = await api('/api/admin/messages?status=new', cookie);
    expect(list.status).toBe(200);
    const msg = (list.body as any[]).find((m) => m.email === 'admintest-hieyson@example.com');
    expect(msg).toBeTruthy();

    const bad = await api(`/api/admin/messages/${msg.id}`, cookie, 'PATCH', { status: 'x' });
    expect(bad.status).toBe(400);
    const ok = await api(`/api/admin/messages/${msg.id}`, cookie, 'PATCH', { status: 'read' });
    expect(ok.body.status).toBe('read');

    const del = await api(`/api/admin/messages/${msg.id}`, cookie, 'DELETE');
    expect(del.status).toBe(200);
  });

  it('settings: leer y reescribir misma key sin cambios', async () => {
    const get = await api('/api/admin/settings', cookie);
    expect(get.body.contact.email).toContain('@');
    const put = await api('/api/admin/settings/copyright', cookie, 'PUT', {
      value: get.body.copyright,
    });
    expect(put.status).toBe(200);
  });

  it('projects/testimonials/clients: listas admin visibles', async () => {
    const pr = await api('/api/admin/projects', cookie);
    expect((pr.body as any[]).length).toBe(4);
    const te = await api('/api/admin/testimonials', cookie);
    expect((te.body as any[]).length).toBe(2);
    const cl = await api('/api/admin/clients', cookie);
    expect((cl.body as any[]).length).toBe(3);
  });
});
