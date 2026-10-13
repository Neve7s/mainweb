import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

// Ajustes globales del sitio (contacto, sociales, hero, seo). value = JSON libre.
export const siteSettings = pgTable('site_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
});

// Servicios (seed: s1..s4 desde services.json es/en).
export const services = pgTable('services', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  icon: text('icon').notNull().default('terminal'),
  categoryEs: text('category_es').notNull(),
  categoryEn: text('category_en').notNull(),
  titleEs: text('title_es').notNull(),
  titleEn: text('title_en').notNull(),
  humanTitleEs: text('human_title_es').notNull(),
  humanTitleEn: text('human_title_en').notNull(),
  descEs: text('desc_es').notNull(),
  descEn: text('desc_en').notNull(),
  examples: jsonb('examples').notNull().$type<
    Array<{ title_es: string; title_en: string; desc_es: string; desc_en: string }>
  >(),
  ctaHeadingEs: text('cta_heading_es').notNull(),
  ctaHeadingEn: text('cta_heading_en').notNull(),
  ctaDescEs: text('cta_desc_es').notNull(),
  ctaDescEn: text('cta_desc_en').notNull(),
  ctaButtonEs: text('cta_button_es').notNull(),
  ctaButtonEn: text('cta_button_en').notNull(),
  order: integer('order').notNull().default(0),
  published: boolean('published').notNull().default(true),
});

// Proyectos (seed: Proyectos.json + Proyectos_en.json).
export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  categoriaEs: text('categoria_es').notNull(),
  categoriaEn: text('categoria_en').notNull(),
  tecnologias: text('tecnologias').array().notNull(),
  tecnologiasListadoEs: text('tecnologias_listado_es').notNull(),
  tecnologiasListadoEn: text('tecnologias_listado_en').notNull(),
  tituloListadoEs: text('titulo_listado_es').notNull(),
  tituloListadoEn: text('titulo_listado_en').notNull(),
  tituloModalEs: text('titulo_modal_es'),
  tituloModalEn: text('titulo_modal_en'),
  descripcionListadoEs: text('descripcion_listado_es').notNull(),
  descripcionListadoEn: text('descripcion_listado_en').notNull(),
  descripcionFullEs: text('descripcion_full_es').notNull(),
  descripcionFullEn: text('descripcion_full_en').notNull(),
  url: text('url'),
  imagenes: text('imagenes').array().notNull(),
  imagenIds: text('imagen_ids').array().notNull(),
  tags: text('tags').array().notNull(),
  stack: text('stack').array().notNull(),
  serviciosRel: text('servicios_rel').array().notNull(),
  logros: text('logros').array().notNull(),
  destacado: boolean('destacado').notNull().default(false),
  order: integer('order').notNull().default(0),
  published: boolean('published').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// Blog y noticias SEPARADOS por `type`. Sin seed inicial (se crean en /admin).
export const posts = pgTable(
  'posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    type: text('type').notNull(),
    titleEs: text('title_es').notNull(),
    titleEn: text('title_en').notNull(),
    excerptEs: text('excerpt_es').notNull(),
    excerptEn: text('excerpt_en').notNull(),
    contentMdEs: text('content_md_es').notNull(),
    contentMdEn: text('content_md_en').notNull(),
    cover: text('cover'),
    coverId: text('cover_id'),
    imagenes: text('imagenes').array().notNull(),
    imagenIds: text('imagen_ids').array().notNull(),
    tags: text('tags').array().notNull(),
    published: boolean('published').notNull().default(false),
    publishedAt: timestamp('published_at'),
    author: text('author').notNull().default('HieysoN'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [
    check('posts_type_check', sql`${t.type} IN ('blog','noticia')`),
    index('posts_type_published_idx').on(t.type, t.published),
    index('posts_published_at_idx').on(t.publishedAt),
  ],
);

// Testimonios (seed: Calificacion.json).
export const testimonials = pgTable('testimonials', {
  id: text('id').primaryKey(),
  compania: text('compania').notNull(),
  url: text('url'),
  foto: text('foto'),
  nombre: text('nombre').notNull(),
  email: text('email'),
  telefono: text('telefono'),
  mensajeEs: text('mensaje_es').notNull(),
  mensajeEn: text('mensaje_en').notNull(),
  rating: integer('rating').notNull().default(5),
  order: integer('order').notNull().default(0),
  published: boolean('published').notNull().default(true),
});

// Clientes (seed: Clientes.json).
export const clients = pgTable('clients', {
  id: text('id').primaryKey(),
  compania: text('compania').notNull(),
  url: text('url'),
  icono: text('icono'),
  order: integer('order').notNull().default(0),
  published: boolean('published').notNull().default(true),
});

// Admin (solo tú). Se crea con ADMIN_EMAIL/ADMIN_PASSWORD en el seed si está vacío.
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Lista blanca de correos que PUEDEN registrarse. La gestiona el admin.
// El registro crea el usuario + JWT automáticamente; sin estar aquí, 403.
export const allowedEmails = pgTable('allowed_emails', {
  email: text('email').primaryKey(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Bandeja del formulario de contacto. Solo la crea el endpoint público.
export const contactMessages = pgTable(
  'contact_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    message: text('message').notNull(),
    source: text('source').notNull().default('footer'),
    lang: text('lang').notNull().default('es'),
    status: text('status').notNull().default('new'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [
    check(
      'contact_messages_status_check',
      sql`${t.status} IN ('new','read','replied','archived')`,
    ),
    index('contact_messages_status_idx').on(t.status),
  ],
);
