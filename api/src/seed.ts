import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db, pool } from './db/client';
import {
  allowedEmails,
  clients,
  projects,
  services,
  siteSettings,
  testimonials,
  users,
} from './db/schema';
import serviciosData from '../../src/data/services.json';
import proyectosEsData from '../../src/data/jsons/Proyectos.json';
import proyectosEnData from '../../src/data/jsons/Proyectos_en.json';
import clientesData from '../../src/data/jsons/Clientes.json';
import calificacionData from '../../src/data/jsons/Calificacion.json';
import siteData from '../../src/data/site.json';

// Idempotente: todo por upsert. Re-ejecutar actualiza sin duplicar.
// Solo `users` se inserta si la tabla está vacía (no pisa tu password).

interface ServiceJson {
  id: string;
  icon: string;
  category: string;
  title: string;
  human_title: string;
  desc: string;
  examples: Array<{ title: string; desc: string }>;
  cta_heading: string;
  cta_desc: string;
  cta_button: string;
}

interface ProjectJson {
  id: string;
  categoria: string;
  tecnologias_listado: string;
  titulo_listado: string;
  descripcion_listado: string;
  titulo_modal?: string;
  desafio?: string;
  solucion?: string;
  url?: string;
  imagenes: string[];
  tags: string[];
  logros: string[];
  stack: string[];
  servicios: string[];
}

const SERVICE_SLUGS: Record<string, string> = {
  s1: 'desarrollo-software-a-medida',
  s2: 'agentes-ia-chatbots',
  s3: 'automatizaciones-n8n',
  s4: 'sistemas-b2b-dashboards',
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function splitTechs(s: string): string[] {
  return s
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

function withSlash(p: string): string {
  return p.startsWith('/') ? p : `/${p}`;
}

async function seedServices() {
  const es = serviciosData.es as unknown as ServiceJson[];
  const en = serviciosData.en as unknown as ServiceJson[];
  const enById = new Map(en.map((s) => [s.id, s]));
  let n = 0;
  for (const [i, s] of es.entries()) {
    const t = enById.get(s.id);
    if (!t) throw new Error(`[seed] servicio ${s.id} sin traducción en`);
    await db
      .insert(services)
      .values({
        id: s.id,
        slug: SERVICE_SLUGS[s.id] ?? slugify(s.title),
        icon: s.icon,
        categoryEs: s.category,
        categoryEn: t.category,
        titleEs: s.title,
        titleEn: t.title,
        humanTitleEs: s.human_title,
        humanTitleEn: t.human_title,
        descEs: s.desc,
        descEn: t.desc,
        examples: s.examples.map((e, j) => ({
          title_es: e.title,
          title_en: t.examples[j]?.title ?? '',
          desc_es: e.desc,
          desc_en: t.examples[j]?.desc ?? '',
        })),
        ctaHeadingEs: s.cta_heading,
        ctaHeadingEn: t.cta_heading,
        ctaDescEs: s.cta_desc,
        ctaDescEn: t.cta_desc,
        ctaButtonEs: s.cta_button,
        ctaButtonEn: t.cta_button,
        order: i,
        published: true,
      })
      .onConflictDoNothing();
    n++;
  }
  console.log(`[seed] services: ${n}`);
}

async function seedProjects() {
  const es = (proyectosEsData as unknown as { proyectos: ProjectJson[] }).proyectos;
  const en = (proyectosEnData as unknown as { proyectos: ProjectJson[] }).proyectos;
  const enById = new Map(en.map((p) => [p.id, p]));
  let n = 0;
  for (const [i, p] of es.entries()) {
    const t = enById.get(p.id);
    if (!t) throw new Error(`[seed] proyecto ${p.id} sin traducción en`);
    const desafioEs = p.desafio ?? '';
    const solucionEs = p.solucion ?? '';
    const desafioEn = t.desafio ?? '';
    const solucionEn = t.solucion ?? '';
    await db
      .insert(projects)
      .values({
        id: p.id,
        slug: p.id,
        categoriaEs: p.categoria,
        categoriaEn: t.categoria,
        tecnologias: splitTechs(p.tecnologias_listado),
        tecnologiasListadoEs: p.tecnologias_listado,
        tecnologiasListadoEn: t.tecnologias_listado,
        tituloListadoEs: p.titulo_listado,
        tituloListadoEn: t.titulo_listado,
        descripcionListadoEs: p.descripcion_listado,
        descripcionListadoEn: t.descripcion_listado,
        descripcionFullEs: `${desafioEs}\n\n${solucionEs}`.trim(),
        descripcionFullEn: `${desafioEn}\n\n${solucionEn}`.trim(),
        tituloModalEs: p.titulo_modal ?? null,
        tituloModalEn: t.titulo_modal ?? null,
        url: p.url ?? null,
        imagenes: p.imagenes.map(withSlash),
        imagenIds: [],
        tags: p.tags ?? [],
        stack: p.stack ?? [],
        serviciosRel: p.servicios ?? [],
        logros: p.logros ?? [],
        destacado: i < 3,
        order: i,
        published: true,
      })
      .onConflictDoNothing();
    n++;
  }
  console.log(`[seed] projects: ${n} (primeros 3 marcados destacado)`);
}

async function seedTestimonials() {
  const list = (calificacionData as unknown as { comentarios: Array<Record<string, unknown>> }).comentarios;
  let n = 0;
  for (const [i, c] of list.entries()) {
    const id = slugify(String(c['Compañia'] ?? `testimonio-${i}`));
    await db
      .insert(testimonials)
      .values({
        id,
        compania: String(c['Compañia'] ?? ''),
        url: (c['url'] as string) || null,
        foto: (c['foto'] as string) || null,
        nombre: String(c['nombre'] ?? ''),
        email: (c['email'] as string) || null,
        telefono: (c['telefono'] as string) || null,
        mensajeEs: String(c['mensaje'] ?? ''),
        mensajeEn: String(c['mensaje_en'] ?? ''),
        rating: Number(c['rating'] ?? 5),
        order: i,
        published: true,
      })
      .onConflictDoNothing();
    n++;
  }
  console.log(`[seed] testimonials: ${n}`);
}

async function seedClients() {
  const list = (clientesData as unknown as { clientes: Array<Record<string, unknown>> }).clientes;
  let n = 0;
  for (const [i, c] of list.entries()) {
    const id = slugify(String(c['Compañia'] ?? `cliente-${i}`));
    await db
      .insert(clients)
      .values({
        id,
        compania: String(c['Compañia'] ?? ''),
        url: (c['url'] as string) || null,
        icono: (c['Icono'] as string) || null,
        order: i,
        published: true,
      })
      .onConflictDoNothing();
    n++;
  }
  console.log(`[seed] clients: ${n}`);
}

async function seedSiteSettings() {
  const site = siteData as unknown as Record<string, unknown>;
  const social = ((site['social'] ?? []) as Array<Record<string, unknown>>).map((s) => ({
    ...s,
    enabled: true,
  }));
  const entries: Array<[string, unknown]> = [
    ['brand', {
      name: 'HieysoN',
      logo_dark: '/img/logo/white/favicon-96x96.png',
      logo_light: '/img/logo/black/favicon-96x96.png',
    }],
    ['contact', site['contact']],
    ['social', social],
    ['socialCompact', site['socialCompact']],
    ['copyright', site['copyright']],
    ['jsonLd', site['jsonLd']],
  ];
  // Solo inserta claves ausentes: jamás pisa lo que editaste en /admin.
  for (const [key, value] of entries) {
    const existing = await db
      .select({ key: siteSettings.key })
      .from(siteSettings)
      .where(eq(siteSettings.key, key));
    if (existing.length === 0) {
      await db.insert(siteSettings).values({ key, value: value as object });
    }
  }
  console.log(`[seed] site_settings: ${entries.length}`);
}

async function seedAllowedEmails() {
  const defaults = ['developer@hieyson.com'];
  const adminEnv = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  if (adminEnv) defaults.push(adminEnv);
  for (const email of [...new Set(defaults)]) {
    await db.insert(allowedEmails).values({ email }).onConflictDoNothing();
  }
  console.log('[seed] allowed_emails verificados');
}

async function seedAdminUser() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!email) {
    console.log('[seed] users: sin ADMIN_EMAIL, se omite (regístrate en /admin/registro si tu correo está permitido)');
    return;
  }
  const existing = await db.select().from(users).where(eq(users.email, email));
  if (!password) {
    // Solo email: el correo queda autorizado y la clave se define en /admin/registro.
    console.log(`[seed] users: ${email} sin ADMIN_PASSWORD, define tu clave en /admin/registro`);
    return;
  }
  // Con ADMIN_PASSWORD: crea o SINCRONIZA la clave (sirve para recuperar acceso:
  // pones la clave nueva en el env, redespliegas, entras, y puedes quitar el env).
  const passwordHash = await bcrypt.hash(password, 12);
  if (existing.length === 0) {
    await db.insert(users).values({ email, passwordHash });
    console.log(`[seed] users: admin ${email} creado`);
  } else {
    await db.update(users).set({ passwordHash }).where(eq(users.email, email));
    console.log(`[seed] users: clave de ${email} sincronizada desde ADMIN_PASSWORD`);
  }
}

async function main() {
  await seedServices();
  await seedProjects();
  await seedTestimonials();
  await seedClients();
  await seedSiteSettings();
  await seedAllowedEmails();
  await seedAdminUser();
  console.log('[seed] OK');
  await pool.end();
}

main().catch(async (err) => {
  console.error('[seed] FAILED', err);
  await pool.end();
  process.exit(1);
});
