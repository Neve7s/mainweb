// Config de entidades del /admin: una sola definición alimenta
// listado + nuevo + editar (src/pages/admin/[entity]/*).
// Los names de campos son las keys snake_case de la API.

export type FieldType =
  | 'text'
  | 'textarea'
  | 'tall'
  | 'number'
  | 'checkbox'
  | 'array'
  | 'json'
  | 'gallery'
  | 'cover'
  | 'select-type';

export interface Field {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  help?: string;
}

export interface EntityConfig {
  key: string;
  title: string;
  singular: string;
  apiBase: string;
  fixed?: Record<string, string>;
  titleOf: (row: any) => string;
  fields: Field[];
}

const PUB: Field = { name: 'published', label: 'Publicado', type: 'checkbox' };
const ORD: Field = { name: 'order', label: 'Orden', type: 'number' };

export const ENTITIES: Record<string, EntityConfig> = {
  servicios: {
    key: 'servicios',
    title: 'Servicios',
    singular: 'servicio',
    apiBase: '/api/admin/services',
    titleOf: (r) => r.titleEs ?? r.id,
    fields: [
      { name: 'slug', label: 'Slug (vacío = auto)', type: 'text' },
      { name: 'icon', label: 'Icono', type: 'text', placeholder: 'terminal | bot | workflow | briefcase' },
      { name: 'category_es', label: 'Categoría ES', type: 'text', required: true },
      { name: 'category_en', label: 'Categoría EN', type: 'text', required: true },
      { name: 'title_es', label: 'Título ES', type: 'text', required: true },
      { name: 'title_en', label: 'Título EN', type: 'text', required: true },
      { name: 'human_title_es', label: 'Titular humano ES', type: 'text', required: true },
      { name: 'human_title_en', label: 'Titular humano EN', type: 'text', required: true },
      { name: 'desc_es', label: 'Descripción ES', type: 'textarea', required: true },
      { name: 'desc_en', label: 'Descripción EN', type: 'textarea', required: true },
      { name: 'examples', label: 'Ejemplos (JSON)', type: 'json', help: '[{"title_es":"..","title_en":"..","desc_es":"..","desc_en":".."}]' },
      { name: 'cta_heading_es', label: 'CTA título ES', type: 'text' },
      { name: 'cta_heading_en', label: 'CTA título EN', type: 'text' },
      { name: 'cta_desc_es', label: 'CTA texto ES', type: 'text' },
      { name: 'cta_desc_en', label: 'CTA texto EN', type: 'text' },
      { name: 'cta_button_es', label: 'CTA botón ES', type: 'text' },
      { name: 'cta_button_en', label: 'CTA botón EN', type: 'text' },
      ORD,
      PUB,
    ],
  },
  proyectos: {
    key: 'proyectos',
    title: 'Proyectos',
    singular: 'proyecto',
    apiBase: '/api/admin/projects',
    titleOf: (r) => r.tituloListadoEs ?? r.id,
    fields: [
      { name: 'slug', label: 'Slug (vacío = auto)', type: 'text' },
      { name: 'categoria_es', label: 'Categoría ES', type: 'text', required: true },
      { name: 'categoria_en', label: 'Categoría EN', type: 'text', required: true },
      { name: 'titulo_listado_es', label: 'Título ES', type: 'text', required: true },
      { name: 'titulo_listado_en', label: 'Título EN', type: 'text', required: true },
      { name: 'descripcion_listado_es', label: 'Descripción corta ES', type: 'textarea', required: true },
      { name: 'descripcion_listado_en', label: 'Descripción corta EN', type: 'textarea', required: true },
      { name: 'descripcion_full_es', label: 'Descripción completa ES', type: 'tall' },
      { name: 'descripcion_full_en', label: 'Descripción completa EN', type: 'tall' },
      { name: 'url', label: 'URL externa', type: 'text', placeholder: 'https://…' },
      { name: 'imagenes', label: 'Galería', type: 'gallery' },
      { name: 'tecnologias_listado_es', label: 'Tecnologías texto ES', type: 'text' },
      { name: 'tecnologias_listado_en', label: 'Tecnologías texto EN', type: 'text' },
      { name: 'tecnologias', label: 'Tecnologías (una por línea)', type: 'array' },
      { name: 'tags', label: 'Tags (uno por línea)', type: 'array' },
      { name: 'stack', label: 'Stack (uno por línea)', type: 'array' },
      { name: 'servicios', label: 'Servicios rel. (uno por línea)', type: 'array' },
      { name: 'logros', label: 'Logros (uno por línea)', type: 'array' },
      { name: 'destacado', label: 'Destacado en home', type: 'checkbox' },
      ORD,
      PUB,
    ],
  },
  blog: {
    key: 'blog',
    title: 'Blog',
    singular: 'artículo',
    apiBase: '/api/admin/posts',
    fixed: { type: 'blog' },
    titleOf: (r) => r.titleEs ?? r.slug,
    fields: [
      { name: 'slug', label: 'Slug (vacío = auto)', type: 'text' },
      { name: 'title_es', label: 'Título ES', type: 'text', required: true },
      { name: 'title_en', label: 'Título EN', type: 'text', required: true },
      { name: 'excerpt_es', label: 'Resumen ES', type: 'textarea', required: true },
      { name: 'excerpt_en', label: 'Resumen EN', type: 'textarea', required: true },
      { name: 'content_md_es', label: 'Contenido MD ES', type: 'tall', required: true },
      { name: 'content_md_en', label: 'Contenido MD EN', type: 'tall', required: true },
      { name: 'cover', label: 'Portada (URL o subir)', type: 'cover' },
      { name: 'imagenes', label: 'Galería', type: 'gallery' },
      { name: 'tags', label: 'Tags (uno por línea)', type: 'array' },
      { name: 'author', label: 'Autor', type: 'text' },
      PUB,
    ],
  },
  noticias: {
    key: 'noticias',
    title: 'Noticias',
    singular: 'noticia',
    apiBase: '/api/admin/posts',
    fixed: { type: 'noticia' },
    titleOf: (r) => r.titleEs ?? r.slug,
    fields: [
      { name: 'slug', label: 'Slug (vacío = auto)', type: 'text' },
      { name: 'title_es', label: 'Título ES', type: 'text', required: true },
      { name: 'title_en', label: 'Título EN', type: 'text', required: true },
      { name: 'excerpt_es', label: 'Resumen ES', type: 'textarea', required: true },
      { name: 'excerpt_en', label: 'Resumen EN', type: 'textarea', required: true },
      { name: 'content_md_es', label: 'Contenido MD ES', type: 'tall', required: true },
      { name: 'content_md_en', label: 'Contenido MD EN', type: 'tall', required: true },
      { name: 'cover', label: 'Portada (URL o subir)', type: 'cover' },
      { name: 'imagenes', label: 'Galería', type: 'gallery' },
      { name: 'tags', label: 'Tags (uno por línea)', type: 'array' },
      { name: 'author', label: 'Autor', type: 'text' },
      PUB,
    ],
  },
  testimonios: {
    key: 'testimonios',
    title: 'Testimonios',
    singular: 'testimonio',
    apiBase: '/api/admin/testimonials',
    titleOf: (r) => `${r.nombre ?? ''} — ${r.compania ?? ''}`,
    fields: [
      { name: 'compania', label: 'Compañía', type: 'text', required: true },
      { name: 'nombre', label: 'Nombre', type: 'text', required: true },
      { name: 'url', label: 'URL', type: 'text' },
      { name: 'email', label: 'Email', type: 'text' },
      { name: 'telefono', label: 'Teléfono', type: 'text' },
      { name: 'mensaje_es', label: 'Mensaje ES', type: 'textarea', required: true },
      { name: 'mensaje_en', label: 'Mensaje EN', type: 'textarea', required: true },
      { name: 'rating', label: 'Rating 1-5', type: 'number' },
      ORD,
      PUB,
    ],
  },
  clientes: {
    key: 'clientes',
    title: 'Clientes',
    singular: 'cliente',
    apiBase: '/api/admin/clients',
    titleOf: (r) => r.compania ?? r.id,
    fields: [
      { name: 'compania', label: 'Compañía', type: 'text', required: true },
      { name: 'url', label: 'URL', type: 'text' },
      { name: 'icono', label: 'Icono (URL)', type: 'text' },
      ORD,
      PUB,
    ],
  },
};

// Convierte FormData del formulario genérico al body de la API.
// Sube archivos nuevos (gallery/cover) antes de armar el body.
export async function formToBody(
  Astro: any,
  cfg: EntityConfig,
  upload: (tipo: string, file: File) => Promise<{ url: string; public_id: string | null }>,
): Promise<{ body: Record<string, any>; error?: string }> {
  const fd = await Astro.request.formData();
  const body: Record<string, any> = { ...(cfg.fixed ?? {}) };

  for (const f of cfg.fields) {
    if (f.type === 'gallery' || f.type === 'cover') continue;
    const raw = fd.get(f.name);
    if (f.type === 'checkbox') {
      body[f.name] = raw === 'on';
    } else if (f.type === 'number') {
      const s = String(raw ?? '').trim();
      if (s !== '') body[f.name] = Number(s);
    } else if (f.type === 'array') {
      const s = String(raw ?? '');
      body[f.name] = s.split('\n').map((x) => x.trim()).filter(Boolean);
    } else if (f.type === 'json') {
      const s = String(raw ?? '').trim();
      if (s === '') {
        body[f.name] = [];
      } else {
        try {
          body[f.name] = JSON.parse(s);
        } catch {
          return { body, error: `JSON inválido en ${f.label}` };
        }
      }
    } else {
      const s = String(raw ?? '');
      if (s !== '' || f.required) body[f.name] = s;
    }
  }

  // Galerías: existentes (hidden JSON) + archivos nuevos subidos.
  for (const f of cfg.fields) {
    if (f.type === 'gallery') {
      let current: string[] = [];
      try {
        current = JSON.parse(String(fd.get(f.name) ?? '[]'));
        if (!Array.isArray(current)) current = [];
      } catch {
        current = [];
      }
      const idsRaw = String(fd.get(`${f.name}__ids`) ?? '[]');
      let ids: (string | null)[] = [];
      try {
        ids = JSON.parse(idsRaw);
        if (!Array.isArray(ids)) ids = [];
      } catch {
        ids = [];
      }
      const files = fd.getAll(`__files_${f.name}`).filter((x): x is File => x instanceof File && x.size > 0);
      for (const file of files) {
        const up = await upload(cfg.key, file);
        current.push(up.url);
        ids.push(up.public_id);
      }
      body[f.name] = current;
      body[`${f.name === 'imagenes' ? 'imagen_ids' : `${f.name}_ids`}`] = ids;
    }
    if (f.type === 'cover') {
      const file = fd.get(`__file_${f.name}`);
      if (file instanceof File && file.size > 0) {
        const up = await upload(cfg.key, file);
        body[f.name] = up.url;
        body[`${f.name}_id`] = up.public_id;
      } else {
        const s = String(fd.get(f.name) ?? '').trim();
        if (s !== '') body[f.name] = s;
      }
    }
  }

  return { body };
}

// Lee valores actuales (fila API camelCase) al formato del formulario (snake).
export function rowToForm(cfg: EntityConfig, row: any): Record<string, any> {
  const out: Record<string, any> = {};
  const camel = (snake: string) => snake.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  for (const f of cfg.fields) {
    if (f.type === 'gallery') {
      out[f.name] = JSON.stringify(row[camel(f.name)] ?? []);
      out[`${f.name}__ids`] = JSON.stringify(row[f.name === 'imagenes' ? 'imagenIds' : `${camel(f.name)}Ids`] ?? []);
    } else if (f.type === 'array') {
      out[f.name] = (row[camel(f.name)] ?? []).join('\n');
    } else if (f.type === 'json') {
      const v = row[camel(f.name)] ?? [];
      out[f.name] = typeof v === 'string' ? v : JSON.stringify(v, null, 2);
    } else if (f.type === 'checkbox') {
      out[f.name] = Boolean(row[camel(f.name)]);
    } else {
      const v = row[camel(f.name)];
      out[f.name] = v === null || v === undefined ? '' : String(v);
    }
  }
  return out;
}
