import { Hono } from 'hono';
import type { Context } from 'hono';
import { and, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '../db/client';
import {
  clients,
  posts,
  projects,
  services,
  siteSettings,
  testimonials,
} from '../db/schema';
import { langError, parseLang } from '../lib/i18n';

export const publicRoutes = new Hono();

// ---------- Servicios ----------
publicRoutes.get('/services', async (c) => {
  const lang = parseLang(c);
  if (!lang) return langError(c);
  const rows = await db
    .select()
    .from(services)
    .where(eq(services.published, true))
    .orderBy(services.order);
  return c.json(
    rows.map((s) => ({
      id: s.id,
      slug: s.slug,
      icon: s.icon,
      category: lang === 'es' ? s.categoryEs : s.categoryEn,
      title: lang === 'es' ? s.titleEs : s.titleEn,
      human_title: lang === 'es' ? s.humanTitleEs : s.humanTitleEn,
      desc: lang === 'es' ? s.descEs : s.descEn,
    })),
  );
});

publicRoutes.get('/services/:slug', async (c) => {
  const lang = parseLang(c);
  if (!lang) return langError(c);
  const rows = await db.select().from(services).where(eq(services.slug, c.req.param('slug')));
  const s = rows[0];
  if (!s || !s.published) return c.json({ error: 'Servicio no encontrado' }, 404);
  return c.json({
    id: s.id,
    slug: s.slug,
    icon: s.icon,
    category: lang === 'es' ? s.categoryEs : s.categoryEn,
    title: lang === 'es' ? s.titleEs : s.titleEn,
    human_title: lang === 'es' ? s.humanTitleEs : s.humanTitleEn,
    desc: lang === 'es' ? s.descEs : s.descEn,
    examples: (s.examples as Array<Record<string, string>>).map((e) => ({
      title: lang === 'es' ? e.title_es : e.title_en,
      desc: lang === 'es' ? e.desc_es : e.desc_en,
    })),
    cta_heading: lang === 'es' ? s.ctaHeadingEs : s.ctaHeadingEn,
    cta_desc: lang === 'es' ? s.ctaDescEs : s.ctaDescEn,
    cta_button: lang === 'es' ? s.ctaButtonEs : s.ctaButtonEn,
  });
});

// ---------- Proyectos ----------
function parseLimit(c: Context, def: number, max: number): number | null {
  const raw = c.req.query('limit') ?? String(def);
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1 || n > max) return null;
  return n;
}

publicRoutes.get('/projects', async (c) => {
  const lang = parseLang(c);
  if (!lang) return langError(c);
  const limit = parseLimit(c, 20, 50);
  if (limit === null) return c.json({ error: 'limit debe ser 1..50' }, 400);
  const dest = c.req.query('destacado');
  const conds = [eq(projects.published, true)];
  if (dest === 'true') conds.push(eq(projects.destacado, true));
  else if (dest === 'false') conds.push(eq(projects.destacado, false));
  else if (dest !== undefined) return c.json({ error: 'destacado debe ser true|false' }, 400);
  const rows = await db
    .select()
    .from(projects)
    .where(and(...conds))
    .orderBy(projects.order)
    .limit(limit);
  return c.json(
    rows.map((p) => ({
      id: p.id,
      slug: p.slug,
      categoria: lang === 'es' ? p.categoriaEs : p.categoriaEn,
      titulo: lang === 'es' ? p.tituloListadoEs : p.tituloListadoEn,
      descripcion: lang === 'es' ? p.descripcionListadoEs : p.descripcionListadoEn,
      tecnologias_listado: lang === 'es' ? p.tecnologiasListadoEs : p.tecnologiasListadoEn,
      cover: p.imagenes[0] ?? null,
      tags: p.tags,
      stack: p.stack,
      destacado: p.destacado,
      url: p.url,
    })),
  );
});

publicRoutes.get('/projects/:slug', async (c) => {
  const lang = parseLang(c);
  if (!lang) return langError(c);
  const rows = await db.select().from(projects).where(eq(projects.slug, c.req.param('slug')));
  const p = rows[0];
  if (!p || !p.published) return c.json({ error: 'Proyecto no encontrado' }, 404);
  return c.json({
    id: p.id,
    slug: p.slug,
    categoria: lang === 'es' ? p.categoriaEs : p.categoriaEn,
    titulo: lang === 'es' ? p.tituloListadoEs : p.tituloListadoEn,
    descripcion: lang === 'es' ? p.descripcionListadoEs : p.descripcionListadoEn,
    descripcion_full: lang === 'es' ? p.descripcionFullEs : p.descripcionFullEn,
    titulo_modal: lang === 'es' ? p.tituloModalEs : p.tituloModalEn,
    tecnologias: p.tecnologias,
    tecnologias_listado: lang === 'es' ? p.tecnologiasListadoEs : p.tecnologiasListadoEn,
    galeria: p.imagenes,
    tags: p.tags,
    stack: p.stack,
    servicios: p.serviciosRel,
    logros: p.logros,
    destacado: p.destacado,
    url: p.url,
  });
});

// ---------- Posts (blog / noticias) ----------
async function listPosts(c: Context, forcedType?: 'blog' | 'noticia') {
  const lang = parseLang(c);
  if (!lang) return langError(c);
  const typeRaw = forcedType ?? c.req.query('type');
  if (typeRaw !== undefined && typeRaw !== 'blog' && typeRaw !== 'noticia') {
    return c.json({ error: 'type debe ser blog|noticia' }, 400);
  }
  const limit = parseLimit(c, 12, 100);
  if (limit === null) return c.json({ error: 'limit debe ser 1..100' }, 400);
  const offsetRaw = c.req.query('offset') ?? '0';
  const offset = Number.parseInt(offsetRaw, 10);
  if (!Number.isFinite(offset) || offset < 0) return c.json({ error: 'offset inválido' }, 400);
  const q = (c.req.query('q') ?? '').trim();
  const tag = (c.req.query('tag') ?? '').trim().toLowerCase();

  const conds = [eq(posts.published, true)];
  if (typeRaw) conds.push(eq(posts.type, typeRaw));
  if (q) {
    const like = `%${q}%`;
    conds.push(
      or(
        ilike(posts.titleEs, like),
        ilike(posts.titleEn, like),
        ilike(posts.excerptEs, like),
        ilike(posts.excerptEn, like),
      )!,
    );
  }
  const where = and(...conds);
  const [totalRows, rows] = await Promise.all([
    db.select({ n: count() }).from(posts).where(where),
    db
      .select()
      .from(posts)
      .where(where)
      .orderBy(sql`${posts.publishedAt} DESC NULLS LAST`)
      .limit(limit)
      .offset(offset),
  ]);
  let items = rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    type: p.type,
    title: lang === 'es' ? p.titleEs : p.titleEn,
    excerpt: lang === 'es' ? p.excerptEs : p.excerptEn,
    cover: p.cover,
    tags: p.tags,
    published_at: p.publishedAt,
    author: p.author,
  }));
  if (tag) items = items.filter((i) => i.tags.some((t) => t.toLowerCase() === tag));
  return c.json({ items, total: totalRows[0]?.n ?? 0 });
}

publicRoutes.get('/posts', (c) => listPosts(c));
publicRoutes.get('/blog', (c) => listPosts(c, 'blog'));
publicRoutes.get('/noticias', (c) => listPosts(c, 'noticia'));

publicRoutes.get('/posts/:slug', async (c) => {
  const lang = parseLang(c);
  if (!lang) return langError(c);
  const rows = await db.select().from(posts).where(eq(posts.slug, c.req.param('slug')));
  const p = rows[0];
  if (!p || !p.published) return c.json({ error: 'Publicación no encontrada' }, 404);
  return c.json({
    id: p.id,
    slug: p.slug,
    type: p.type,
    title: lang === 'es' ? p.titleEs : p.titleEn,
    excerpt: lang === 'es' ? p.excerptEs : p.excerptEn,
    content_md: lang === 'es' ? p.contentMdEs : p.contentMdEn,
    cover: p.cover,
    galeria: p.imagenes,
    tags: p.tags,
    published_at: p.publishedAt,
    author: p.author,
  });
});

// ---------- Settings / testimonios / clientes ----------
publicRoutes.get('/site-settings', async (c) => {
  const rows = await db.select().from(siteSettings);
  const out: Record<string, unknown> = {};
  for (const r of rows) out[r.key] = r.value;
  return c.json(out);
});

publicRoutes.get('/testimonials', async (c) => {
  const lang = parseLang(c);
  if (!lang) return langError(c);
  const rows = await db
    .select()
    .from(testimonials)
    .where(eq(testimonials.published, true))
    .orderBy(testimonials.order);
  return c.json(
    rows.map((t) => ({
      id: t.id,
      compania: t.compania,
      url: t.url,
      foto: t.foto,
      nombre: t.nombre,
      mensaje: lang === 'es' ? t.mensajeEs : t.mensajeEn,
      rating: t.rating,
    })),
  );
});

publicRoutes.get('/clients', async (c) => {
  const rows = await db
    .select()
    .from(clients)
    .where(eq(clients.published, true))
    .orderBy(clients.order);
  return c.json(rows.map((t) => ({ id: t.id, compania: t.compania, url: t.url, icono: t.icono })));
});
