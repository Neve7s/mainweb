# Content Model — HieysoN Web (PostgreSQL, fuente única)

> Spec congelado (Task 2). Bilingüe es/en en contenido. `order` = orden manual en listados.

## Tablas

### site_settings(key TEXT PK, value JSONB)
`contact.email|phone|whatsapp`, `social.*`, `hero.*`, `seo.default_*`. Sin CRUD destructivo.

### services(id TEXT PK, slug UNIQUE, icon, order INT, published BOOL, …)
`category_es/en`, `title_es/en`, `human_title_es/en`, `desc_es/en`, `examples JSONB [{title_es,en,desc_es,en}]`, `cta_heading_es/en`, `cta_desc_es/en`, `cta_button_es/en`. Seed: 4 (`s1..s4`).

### projects(id TEXT PK, slug UNIQUE, destacado BOOL, order INT, published BOOL, …)
`categoria_es/en`, `titulo_listado_es/en`, `descripcion_listado_es/en`, `descripcion_full_es/en`, `tecnologias TEXT[]`, `imagenes TEXT[]` (galería 1..N, cover = [0]), `imagen_ids TEXT[]` (solo Cloudinary).

### posts(id UUID PK, slug UNIQUE, type CHECK IN ('blog','noticia'), …)
`title_es/en`, `excerpt_es/en`, `content_md_es/en`, `cover TEXT`, `cover_id TEXT`, `imagenes TEXT[]`, `imagen_ids TEXT[]`, `tags TEXT[]`, `published BOOL`, `published_at TIMESTAMPTZ`, `author TEXT`.

### testimonials / clients
Desde `Calificacion.json` / `Clientes.json` tal cual + `order`, `published`.

### users
Solo admin. `email UNIQUE`, `password_hash`.

### contact_messages (solo la crea el formulario público)
`id UUID PK`, `name`, `email`, `message`, `source DEFAULT 'footer'`, `lang DEFAULT 'es'`, `status DEFAULT 'new' CHECK IN ('new','read','replied','archived')`, `created_at DEFAULT now()`. Admin: solo lectura + cambio de estado + borrado. Sin seed.

## Storage de imágenes

| Entorno | Driver (`STORAGE_DRIVER`) | Destino |
|---------|---------------------------|---------|
| local | `local` | `uploads/<tipo>/` con `<tipo>` = servicios\|proyectos\|blog\|noticias\|misc. Servido por la API en `/uploads/*`. |
| prod (Coolify) | `cloudinary` | Carpeta `hieyson/<tipo>/`, transform `f_auto,q_auto,w_1600` + thumb 800px. En DB: `secure_url` + `public_id`. |

Regla: no subir `.exe`/svg animado, máx 8MB, solo jpg/png/webp. Al borrar una entrada se borra su `public_id` (prod) o archivo (local).

## Rutas y fuente

- `/` → teasers: servicios(4) + proyectos destacados(3) + blogs(3) + noticias(3).
- `/servicios`, `/servicios/[slug]` · `/proyectos`, `/proyectos/[slug]` · `/blog`, `/blog/[slug]` · `/noticias`, `/noticias/[slug]`.
- `/admin/*` → `hieyson.com/admin` (misma app Astro, guard SSR por cookie JWT). Incluye `/admin/mensajes` (bandeja contacto).
- `POST /api/contact` (público, rate-limit 10/min/IP + honeypot) → `contact_messages`. `POST /api/chat` (público, rate-limit 20/min/IP) → NVIDIA.
- i18n UI sigue en `locales/*.json`; contenido en columnas `*_es/en`. Publicar exige ambas no vacías.
