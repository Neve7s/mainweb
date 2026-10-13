import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/client';
import {
  clients,
  contactMessages,
  posts,
  projects,
  services,
  siteSettings,
  testimonials,
} from '../db/schema';
import { requireAdmin } from '../lib/auth';
import { slugify } from '../lib/slug';

export const adminRoutes = new Hono();
// Path explícito (no '*'): el '*' de un sub-app montado con route() alcanzaría
// a rutas hermanas registradas después (ej. /api/chat). Así solo cubre /api/admin/*.
adminRoutes.use('/admin/*', requireAdmin);

// ---------- helpers ----------
function isConflict(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: string }).code === '23505';
}

async function reqJson(c: Context): Promise<unknown | null> {
  try {
    return await c.req.json();
  } catch {
    return null;
  }
}

// Ejecuta fn mapeando violación de unicidad a 409; el resto sube al onError (500).
async function safe(c: Context, fn: () => Promise<unknown>, status = 200) {
  try {
    return c.json(await fn(), status as 200);
  } catch (e) {
    if (isConflict(e)) return c.json({ error: 'Duplicado: id o slug ya existe' }, 409);
    throw e;
  }
}

function parseLimit(c: Context, def: number, max: number): number | null {
  const n = Number.parseInt(c.req.query('limit') ?? String(def), 10);
  if (!Number.isFinite(n) || n < 1 || n > max) return null;
  return n;
}

const strArr = z.array(z.string()).default([]);
const boolDef = (d: boolean) => z.boolean().default(d);
const numDef = (d: number) => z.number().int().default(d);

// ---------- Servicios ----------
const ServiceBody = z.object({
  id: z.string().min(1).max(60).optional(),
  slug: z.string().min(1).max(120).optional(),
  icon: z.string().max(40).default('terminal'),
  category_es: z.string().min(1).max(120),
  category_en: z.string().min(1).max(120),
  title_es: z.string().min(1).max(200),
  title_en: z.string().min(1).max(200),
  human_title_es: z.string().min(1).max(300),
  human_title_en: z.string().min(1).max(300),
  desc_es: z.string().min(1),
  desc_en: z.string().min(1),
  examples: z
    .array(
      z.object({
        title_es: z.string(),
        title_en: z.string(),
        desc_es: z.string(),
        desc_en: z.string(),
      }),
    )
    .default([]),
  cta_heading_es: z.string().default(''),
  cta_heading_en: z.string().default(''),
  cta_desc_es: z.string().default(''),
  cta_desc_en: z.string().default(''),
  cta_button_es: z.string().default(''),
  cta_button_en: z.string().default(''),
  order: numDef(0),
  published: boolDef(true),
});

function toServiceRow(b: z.infer<typeof ServiceBody>) {
  const slug = b.slug?.trim() || slugify(b.title_es);
  return {
    id: b.id?.trim() || slug,
    slug,
    icon: b.icon,
    categoryEs: b.category_es,
    categoryEn: b.category_en,
    titleEs: b.title_es,
    titleEn: b.title_en,
    humanTitleEs: b.human_title_es,
    humanTitleEn: b.human_title_en,
    descEs: b.desc_es,
    descEn: b.desc_en,
    examples: b.examples,
    ctaHeadingEs: b.cta_heading_es,
    ctaHeadingEn: b.cta_heading_en,
    ctaDescEs: b.cta_desc_es,
    ctaDescEn: b.cta_desc_en,
    ctaButtonEs: b.cta_button_es,
    ctaButtonEn: b.cta_button_en,
    order: b.order,
    published: b.published,
  };
}

adminRoutes.get('/admin/services', async (c) => {
  const rows = await db.select().from(services).orderBy(services.order);
  return c.json(rows);
});

adminRoutes.post('/admin/services', async (c) => {
  const json = await reqJson(c);
  const p = ServiceBody.safeParse(json);
  if (!p.success) return c.json({ error: 'Datos inválidos' }, 400);
  return safe(c, async () => {
    const [row] = await db.insert(services).values(toServiceRow(p.data)).returning();
    return row;
  }, 201);
});

adminRoutes.put('/admin/services/:id', async (c) => {
  const json = await reqJson(c);
  const p = ServiceBody.partial().safeParse(json);
  if (!p.success) return c.json({ error: 'Datos inválidos' }, 400);
  return safe(c, async () => {
    const patch: Record<string, unknown> = {};
    const b = p.data as Record<string, unknown>;
    const map: Record<string, string> = {
      slug: 'slug', icon: 'icon', category_es: 'categoryEs', category_en: 'categoryEn',
      title_es: 'titleEs', title_en: 'titleEn', human_title_es: 'humanTitleEs',
      human_title_en: 'humanTitleEn', desc_es: 'descEs', desc_en: 'descEn',
      examples: 'examples', cta_heading_es: 'ctaHeadingEs', cta_heading_en: 'ctaHeadingEn',
      cta_desc_es: 'ctaDescEs', cta_desc_en: 'ctaDescEn', cta_button_es: 'ctaButtonEs',
      cta_button_en: 'ctaButtonEn', order: 'order', published: 'published',
    };
    for (const [k, col] of Object.entries(map)) if (b[k] !== undefined) patch[col] = b[k];
    const rows = await db
      .update(services)
      .set(patch)
      .where(eq(services.id, c.req.param('id')))
      .returning();
    if (!rows[0]) return c.json({ error: 'No encontrado' }, 404);
    return rows[0];
  });
});

adminRoutes.delete('/admin/services/:id', async (c) => {
  const rows = await db
    .delete(services)
    .where(eq(services.id, c.req.param('id')))
    .returning({ id: services.id });
  if (!rows[0]) return c.json({ error: 'No encontrado' }, 404);
  return c.json({ ok: true });
});

// ---------- Proyectos ----------
const ProjectBody = z.object({
  id: z.string().min(1).max(80).optional(),
  slug: z.string().min(1).max(120).optional(),
  categoria_es: z.string().min(1).max(120),
  categoria_en: z.string().min(1).max(120),
  tecnologias: strArr,
  tecnologias_listado_es: z.string().default(''),
  tecnologias_listado_en: z.string().default(''),
  titulo_listado_es: z.string().min(1).max(200),
  titulo_listado_en: z.string().min(1).max(200),
  descripcion_listado_es: z.string().min(1),
  descripcion_listado_en: z.string().min(1),
  descripcion_full_es: z.string().default(''),
  descripcion_full_en: z.string().default(''),
  titulo_modal_es: z.string().nullable().optional(),
  titulo_modal_en: z.string().nullable().optional(),
  url: z.string().max(300).nullable().optional(),
  imagenes: strArr,
  imagen_ids: strArr,
  tags: strArr,
  stack: strArr,
  servicios: strArr,
  logros: strArr,
  destacado: boolDef(false),
  order: numDef(0),
  published: boolDef(true),
});

function toProjectRow(b: z.infer<typeof ProjectBody>) {
  const slug = b.slug?.trim() || slugify(b.titulo_listado_es);
  return {
    id: b.id?.trim() || slug,
    slug,
    categoriaEs: b.categoria_es,
    categoriaEn: b.categoria_en,
    tecnologias: b.tecnologias,
    tecnologiasListadoEs: b.tecnologias_listado_es,
    tecnologiasListadoEn: b.tecnologias_listado_en,
    tituloListadoEs: b.titulo_listado_es,
    tituloListadoEn: b.titulo_listado_en,
    descripcionListadoEs: b.descripcion_listado_es,
    descripcionListadoEn: b.descripcion_listado_en,
    descripcionFullEs: b.descripcion_full_es,
    descripcionFullEn: b.descripcion_full_en,
    tituloModalEs: b.titulo_modal_es ?? null,
    tituloModalEn: b.titulo_modal_en ?? null,
    url: b.url ?? null,
    imagenes: b.imagenes,
    imagenIds: b.imagen_ids,
    tags: b.tags,
    stack: b.stack,
    serviciosRel: b.servicios,
    logros: b.logros,
    destacado: b.destacado,
    order: b.order,
    published: b.published,
  };
}

const PROJECT_PATCH_MAP: Record<string, string> = {
  slug: 'slug', categoria_es: 'categoriaEs', categoria_en: 'categoriaEn',
  tecnologias: 'tecnologias', tecnologias_listado_es: 'tecnologiasListadoEs',
  tecnologias_listado_en: 'tecnologiasListadoEn', titulo_listado_es: 'tituloListadoEs',
  titulo_listado_en: 'tituloListadoEn', descripcion_listado_es: 'descripcionListadoEs',
  descripcion_listado_en: 'descripcionListadoEn', descripcion_full_es: 'descripcionFullEs',
  descripcion_full_en: 'descripcionFullEn', titulo_modal_es: 'tituloModalEs',
  titulo_modal_en: 'tituloModalEn', url: 'url', imagenes: 'imagenes',
  imagen_ids: 'imagenIds', tags: 'tags', stack: 'stack', servicios: 'serviciosRel',
  logros: 'logros', destacado: 'destacado', order: 'order', published: 'published',
};

adminRoutes.get('/admin/projects', async (c) => {
  const rows = await db.select().from(projects).orderBy(projects.order);
  return c.json(rows);
});

adminRoutes.post('/admin/projects', async (c) => {
  const json = await reqJson(c);
  const p = ProjectBody.safeParse(json);
  if (!p.success) return c.json({ error: 'Datos inválidos' }, 400);
  return safe(c, async () => {
    const [row] = await db.insert(projects).values(toProjectRow(p.data)).returning();
    return row;
  }, 201);
});

adminRoutes.put('/admin/projects/:id', async (c) => {
  const json = await reqJson(c);
  const p = ProjectBody.partial().safeParse(json);
  if (!p.success) return c.json({ error: 'Datos inválidos' }, 400);
  return safe(c, async () => {
    const patch: Record<string, unknown> = {};
    const b = p.data as Record<string, unknown>;
    for (const [k, col] of Object.entries(PROJECT_PATCH_MAP)) if (b[k] !== undefined) patch[col] = b[k];
    const rows = await db
      .update(projects)
      .set(patch)
      .where(eq(projects.id, c.req.param('id')))
      .returning();
    if (!rows[0]) return c.json({ error: 'No encontrado' }, 404);
    return rows[0];
  });
});

adminRoutes.delete('/admin/projects/:id', async (c) => {
  const rows = await db
    .delete(projects)
    .where(eq(projects.id, c.req.param('id')))
    .returning({ id: projects.id });
  if (!rows[0]) return c.json({ error: 'No encontrado' }, 404);
  return c.json({ ok: true });
});

// ---------- Posts ----------
const PostBody = z.object({
  slug: z.string().min(1).max(160).optional(),
  type: z.enum(['blog', 'noticia']),
  title_es: z.string().min(1).max(200),
  title_en: z.string().min(1).max(200),
  excerpt_es: z.string().min(1).max(500),
  excerpt_en: z.string().min(1).max(500),
  content_md_es: z.string().min(1),
  content_md_en: z.string().min(1),
  cover: z.string().nullable().optional(),
  cover_id: z.string().nullable().optional(),
  imagenes: strArr,
  imagen_ids: strArr,
  tags: strArr,
  published: boolDef(false),
  published_at: z.string().datetime({ offset: true }).nullable().optional(),
  author: z.string().max(120).default('HieysoN'),
});

function toPostRow(b: z.infer<typeof PostBody>) {
  const publishedAt =
    b.published_at != null
      ? new Date(b.published_at)
      : b.published
        ? new Date()
        : null;
  return {
    slug: b.slug?.trim() || slugify(b.title_es),
    type: b.type,
    titleEs: b.title_es,
    titleEn: b.title_en,
    excerptEs: b.excerpt_es,
    excerptEn: b.excerpt_en,
    contentMdEs: b.content_md_es,
    contentMdEn: b.content_md_en,
    cover: b.cover ?? null,
    coverId: b.cover_id ?? null,
    imagenes: b.imagenes,
    imagenIds: b.imagen_ids,
    tags: b.tags,
    published: b.published,
    publishedAt,
    author: b.author,
  };
}

const POST_PATCH_MAP: Record<string, string> = {
  slug: 'slug', type: 'type', title_es: 'titleEs', title_en: 'titleEn',
  excerpt_es: 'excerptEs', excerpt_en: 'excerptEn', content_md_es: 'contentMdEs',
  content_md_en: 'contentMdEn', cover: 'cover', cover_id: 'coverId',
  imagenes: 'imagenes', imagen_ids: 'imagenIds', tags: 'tags',
  published: 'published', author: 'author',
};

adminRoutes.get('/admin/posts', async (c) => {
  const type = c.req.query('type');
  if (type !== undefined && type !== 'blog' && type !== 'noticia') {
    return c.json({ error: 'type debe ser blog|noticia' }, 400);
  }
  const limit = parseLimit(c, 50, 200);
  if (limit === null) return c.json({ error: 'limit inválido' }, 400);
  const conds = type ? [eq(posts.type, type)] : [];
  const rows = await db
    .select()
    .from(posts)
    .where(and(...conds))
    .orderBy(sql`${posts.publishedAt} DESC NULLS LAST`, desc(posts.createdAt))
    .limit(limit);
  return c.json(rows);
});

adminRoutes.post('/admin/posts', async (c) => {
  const json = await reqJson(c);
  const p = PostBody.safeParse(json);
  if (!p.success) return c.json({ error: 'Datos inválidos' }, 400);
  return safe(c, async () => {
    const [row] = await db.insert(posts).values(toPostRow(p.data)).returning();
    return row;
  }, 201);
});

adminRoutes.put('/admin/posts/:id', async (c) => {
  const json = await reqJson(c);
  const p = PostBody.partial().safeParse(json);
  if (!p.success) return c.json({ error: 'Datos inválidos' }, 400);
  return safe(c, async () => {
    const patch: Record<string, unknown> = {};
    const b = p.data as Record<string, unknown>;
    for (const [k, col] of Object.entries(POST_PATCH_MAP)) if (b[k] !== undefined) patch[col] = b[k];
    if (b['published_at'] !== undefined) {
      patch['publishedAt'] = b['published_at'] == null ? null : new Date(b['published_at'] as string);
    }
    if (b['published'] === true && b['published_at'] === undefined) {
      const cur = await db.select({ publishedAt: posts.publishedAt }).from(posts).where(eq(posts.id, c.req.param('id')));
      if (cur[0] && !cur[0].publishedAt) patch['publishedAt'] = new Date();
    }
    const rows = await db
      .update(posts)
      .set(patch)
      .where(eq(posts.id, c.req.param('id')))
      .returning();
    if (!rows[0]) return c.json({ error: 'No encontrado' }, 404);
    return rows[0];
  });
});

adminRoutes.delete('/admin/posts/:id', async (c) => {
  const rows = await db
    .delete(posts)
    .where(eq(posts.id, c.req.param('id')))
    .returning({ id: posts.id });
  if (!rows[0]) return c.json({ error: 'No encontrado' }, 404);
  return c.json({ ok: true });
});

// ---------- Testimonios / clientes ----------
const TestimonialBody = z.object({
  id: z.string().min(1).max(80).optional(),
  compania: z.string().min(1).max(160),
  url: z.string().max(300).nullable().optional(),
  foto: z.string().nullable().optional(),
  nombre: z.string().min(1).max(160),
  email: z.string().max(254).nullable().optional(),
  telefono: z.string().max(40).nullable().optional(),
  mensaje_es: z.string().min(1),
  mensaje_en: z.string().min(1),
  rating: z.number().int().min(1).max(5).default(5),
  order: numDef(0),
  published: boolDef(true),
});

adminRoutes.get('/admin/testimonials', async (c) => {
  return c.json(await db.select().from(testimonials).orderBy(testimonials.order));
});

adminRoutes.post('/admin/testimonials', async (c) => {
  const json = await reqJson(c);
  const p = TestimonialBody.safeParse(json);
  if (!p.success) return c.json({ error: 'Datos inválidos' }, 400);
  return safe(c, async () => {
    const b = p.data;
    const id = b.id?.trim() || slugify(b.compania);
    const [row] = await db
      .insert(testimonials)
      .values({
        id,
        compania: b.compania,
        url: b.url ?? null,
        foto: b.foto ?? null,
        nombre: b.nombre,
        email: b.email ?? null,
        telefono: b.telefono ?? null,
        mensajeEs: b.mensaje_es,
        mensajeEn: b.mensaje_en,
        rating: b.rating,
        order: b.order,
        published: b.published,
      })
      .returning();
    return row;
  }, 201);
});

adminRoutes.delete('/admin/testimonials/:id', async (c) => {
  const rows = await db
    .delete(testimonials)
    .where(eq(testimonials.id, c.req.param('id')))
    .returning({ id: testimonials.id });
  if (!rows[0]) return c.json({ error: 'No encontrado' }, 404);
  return c.json({ ok: true });
});

const ClientBody = z.object({
  id: z.string().min(1).max(80).optional(),
  compania: z.string().min(1).max(160),
  url: z.string().max(300).nullable().optional(),
  icono: z.string().nullable().optional(),
  order: numDef(0),
  published: boolDef(true),
});

adminRoutes.get('/admin/clients', async (c) => {
  return c.json(await db.select().from(clients).orderBy(clients.order));
});

adminRoutes.post('/admin/clients', async (c) => {
  const json = await reqJson(c);
  const p = ClientBody.safeParse(json);
  if (!p.success) return c.json({ error: 'Datos inválidos' }, 400);
  return safe(c, async () => {
    const b = p.data;
    const id = b.id?.trim() || slugify(b.compania);
    const [row] = await db
      .insert(clients)
      .values({
        id,
        compania: b.compania,
        url: b.url ?? null,
        icono: b.icono ?? null,
        order: b.order,
        published: b.published,
      })
      .returning();
    return row;
  }, 201);
});

adminRoutes.delete('/admin/clients/:id', async (c) => {
  const rows = await db
    .delete(clients)
    .where(eq(clients.id, c.req.param('id')))
    .returning({ id: clients.id });
  if (!rows[0]) return c.json({ error: 'No encontrado' }, 404);
  return c.json({ ok: true });
});

// ---------- Settings ----------
adminRoutes.get('/admin/settings', async (c) => {
  const rows = await db.select().from(siteSettings);
  const out: Record<string, unknown> = {};
  for (const r of rows) out[r.key] = r.value;
  return c.json(out);
});

adminRoutes.put('/admin/settings/:key', async (c) => {
  const key = c.req.param('key');
  if (!/^[a-zA-Z0-9_-]{1,60}$/.test(key)) return c.json({ error: 'key inválida' }, 400);
  const json = await reqJson(c);
  if (json === null || typeof json !== 'object' || !('value' in (json as object))) {
    return c.json({ error: 'Se espera { value }' }, 400);
  }
  const value = (json as { value: unknown }).value;
  await db
    .insert(siteSettings)
    .values({ key, value: value as object })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value: value as object } });
  return c.json({ ok: true, key });
});

// ---------- Bandeja de contacto ----------
const StatusBody = z.object({ status: z.enum(['new', 'read', 'replied', 'archived']) });

adminRoutes.get('/admin/messages', async (c) => {
  const status = c.req.query('status');
  if (status !== undefined && !['new', 'read', 'replied', 'archived'].includes(status)) {
    return c.json({ error: 'status inválido' }, 400);
  }
  const limit = parseLimit(c, 50, 200);
  if (limit === null) return c.json({ error: 'limit inválido' }, 400);
  const conds = status ? [eq(contactMessages.status, status)] : [];
  const rows = await db
    .select()
    .from(contactMessages)
    .where(and(...conds))
    .orderBy(desc(contactMessages.createdAt))
    .limit(limit);
  return c.json(rows);
});

adminRoutes.patch('/admin/messages/:id', async (c) => {
  const json = await reqJson(c);
  const p = StatusBody.safeParse(json);
  if (!p.success) return c.json({ error: 'status inválido' }, 400);
  const rows = await db
    .update(contactMessages)
    .set({ status: p.data.status })
    .where(eq(contactMessages.id, c.req.param('id')))
    .returning();
  if (!rows[0]) return c.json({ error: 'No encontrado' }, 404);
  return c.json(rows[0]);
});

adminRoutes.delete('/admin/messages/:id', async (c) => {
  const rows = await db
    .delete(contactMessages)
    .where(eq(contactMessages.id, c.req.param('id')))
    .returning({ id: contactMessages.id });
  if (!rows[0]) return c.json({ error: 'No encontrado' }, 404);
  return c.json({ ok: true });
});
