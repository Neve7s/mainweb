// Cliente del CMS (API Hono) con fallback a los JSON locales.
// Si la API está caída o tarda, la web sigue funcionando con los JSON
// (mismo comportamiento que el sitio estático anterior) y avisa en el log.
// Uso server-side (Astro prerender/SSR): lee API_URL, no PUBLIC_*.

import servicesData from '../data/services.json';
import proyectosEs from '../data/jsons/Proyectos.json';
import proyectosEn from '../data/jsons/Proyectos_en.json';
import clientesData from '../data/jsons/Clientes.json';
import calificacionData from '../data/jsons/Calificacion.json';
import siteData from '../data/site.json';

export type Lang = 'es' | 'en';

const API = import.meta.env.API_URL || 'http://localhost:3001';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    signal: AbortSignal.timeout(5000),
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`API ${res.status} en ${path}`);
  return (await res.json()) as T;
}

async function live<T>(path: string, fallback: () => T, label: string): Promise<T> {
  try {
    return await get<T>(path);
  } catch {
    console.warn(`[cms] API no disponible (${label}), usando JSON local`);
    return fallback();
  }
}

// ---------- Tipos (espejo de la API) ----------
export interface ServiceItem {
  id: string; slug: string; icon: string; category: string;
  title: string; human_title: string; desc: string;
}
export interface ServiceDetail extends ServiceItem {
  examples: Array<{ title: string; desc: string }>;
  cta_heading: string; cta_desc: string; cta_button: string;
}
export interface ProjectItem {
  id: string; slug: string; categoria: string; titulo: string;
  descripcion: string; tecnologias_listado: string; cover: string | null;
  galeria: string[];
  tags: string[]; stack: string[]; destacado: boolean; url: string | null;
}
export interface ProjectDetail extends ProjectItem {
  descripcion_full: string; titulo_modal: string | null; tecnologias: string[];
  galeria: string[]; servicios: string[]; logros: string[];
}
export interface PostItem {
  id: string; slug: string; type: string; title: string; excerpt: string;
  cover: string | null; tags: string[]; published_at: string | null; author: string;
}
export interface PostDetail extends PostItem {
  content_md: string; galeria: string[];
}

// ---------- Servicios ----------
const SERVICE_SLUGS: Record<string, string> = {
  s1: 'desarrollo-software-a-medida',
  s2: 'agentes-ia-chatbots',
  s3: 'automatizaciones-n8n',
  s4: 'sistemas-b2b-dashboards',
};

function localServices(lang: Lang): ServiceItem[] {
  const arr = (servicesData as any)[lang] as any[];
  return arr.map((s) => ({
    id: s.id, slug: SERVICE_SLUGS[s.id] ?? s.id, icon: s.icon,
    category: s.category, title: s.title, human_title: s.human_title, desc: s.desc,
  }));
}

export function getServices(lang: Lang, limit?: number): Promise<ServiceItem[]> {
  return live(
    `/api/services?lang=${lang}`,
    () => (limit ? localServices(lang).slice(0, limit) : localServices(lang)),
    'services',
  );
}

export function getService(slug: string, lang: Lang): Promise<ServiceDetail | null> {
  return live<ServiceDetail | null>(
    `/api/services/${slug}?lang=${lang}`,
    () => {
      const arr = (servicesData as any)[lang] as any[];
      const s = arr.find((x) => (SERVICE_SLUGS[x.id] ?? x.id) === slug);
      if (!s) return null;
      return {
        id: s.id, slug, icon: s.icon, category: s.category, title: s.title,
        human_title: s.human_title, desc: s.desc,
        examples: (s.examples ?? []).map((e: any) => ({ title: e.title, desc: e.desc })),
        cta_heading: s.cta_heading ?? '', cta_desc: s.cta_desc ?? '', cta_button: s.cta_button ?? '',
      };
    },
    `service:${slug}`,
  );
}

// ---------- Proyectos ----------
interface ProjJson {
  id: string; categoria: string; tecnologias_listado: string;
  titulo_listado: string; descripcion_listado: string; url?: string;
  imagenes: string[]; tags: string[]; stack: string[]; servicios: string[];
  logros: string[]; desafio?: string; solucion?: string; titulo_modal?: string;
}

function projRows(lang: Lang): ProjJson[] {
  return ((lang === 'es' ? proyectosEs : proyectosEn) as any).proyectos as ProjJson[];
}

function toItem(p: ProjJson, i: number): ProjectItem {
  return {
    id: p.id, slug: p.id, categoria: p.categoria, titulo: p.titulo_listado,
    descripcion: p.descripcion_listado, tecnologias_listado: p.tecnologias_listado,
    cover: p.imagenes[0] ? `/${p.imagenes[0]}` : null,
    galeria: p.imagenes.map((x) => `/${x}`).slice(0, 5),
    tags: p.tags ?? [], stack: p.stack ?? [], destacado: i < 3, url: p.url ?? null,
  };
}

export function getProjects(
  lang: Lang,
  opts: { destacado?: boolean; limit?: number } = {},
): Promise<ProjectItem[]> {
  const q = new URLSearchParams({ lang });
  if (opts.destacado !== undefined) q.set('destacado', String(opts.destacado));
  if (opts.limit !== undefined) q.set('limit', String(opts.limit));
  return live(
    `/api/projects?${q}`,
    () => {
      let items = projRows(lang).map(toItem);
      if (opts.destacado !== undefined) items = items.filter((x) => x.destacado === opts.destacado);
      return opts.limit !== undefined ? items.slice(0, opts.limit) : items;
    },
    'projects',
  );
}

export function getProject(slug: string, lang: Lang): Promise<ProjectDetail | null> {
  return live<ProjectDetail | null>(
    `/api/projects/${slug}?lang=${lang}`,
    () => {
      const i = projRows(lang).findIndex((x) => x.id === slug);
      if (i < 0) return null;
      const p = projRows(lang)[i]!;
      const base = toItem(p, i);
      return {
        ...base,
        descripcion_full: [p.desafio ?? '', p.solucion ?? ''].filter(Boolean).join('\n\n'),
        titulo_modal: p.titulo_modal ?? null,
        tecnologias: (p.tecnologias_listado ?? '').split(',').map((t) => t.trim()).filter(Boolean),
        galeria: p.imagenes.map((x) => `/${x}`),
        servicios: p.servicios ?? [],
        logros: p.logros ?? [],
      };
    },
    `project:${slug}`,
  );
}

// ---------- Blog / noticias ----------
export function getPosts(
  type: 'blog' | 'noticia' | null,
  lang: Lang,
  opts: { limit?: number; q?: string } = {},
): Promise<{ items: PostItem[]; total: number }> {
  const q = new URLSearchParams({ lang });
  if (opts.limit !== undefined) q.set('limit', String(opts.limit));
  if (opts.q) q.set('q', opts.q);
  const path = type === 'blog' ? '/api/blog' : type === 'noticia' ? '/api/noticias' : '/api/posts';
  return live(`${path}?${q}`, () => ({ items: [], total: 0 }), `posts:${type ?? 'all'}`);
}

export function getPost(slug: string, lang: Lang): Promise<PostDetail | null> {
  return live<PostDetail | null>(`/api/posts/${slug}?lang=${lang}`, () => null, `post:${slug}`);
}

// ---------- Settings / testimonios / clientes ----------
export function getSettings(): Promise<Record<string, any>> {
  return live('/api/site-settings', () => siteData as unknown as Record<string, any>, 'settings');
}

export function getTestimonials(lang: Lang) {
  return live(
    `/api/testimonials?lang=${lang}`,
    () =>
      ((calificacionData as any).comentarios as any[]).map((c, i) => ({
        id: `t-${i}`, compania: c['Compañia'] ?? '', url: c['url'] || null,
        foto: c['foto'] || null, nombre: c['nombre'] ?? '',
        mensaje: lang === 'es' ? c['mensaje'] : c['mensaje_en'], rating: c['rating'] ?? 5,
      })),
    'testimonials',
  );
}

export function getClients() {
  return live(
    '/api/clients',
    () =>
      ((clientesData as any).clientes as any[]).map((c, i) => ({
        id: `c-${i}`, compania: c['Compañia'] ?? '', url: c['url'] || null, icono: c['Icono'] || null,
      })),
    'clients',
  );
}
