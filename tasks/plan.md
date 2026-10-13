# Implementation Plan: HieysoN Web — Backend + PostgreSQL + Rediseño Servicios/Proyectos + Blog y Noticias separados + Docker/Coolify

## Overview

El proyecto actual `nosyeihweb-astro` es un sitio **Astro 7 estático** (`output: 'static'`), Tailwind 4, GSAP + Three.js, con datos hardcodeados en JSON (`src/data/services.json`, `src/data/jsons/Proyectos.json`, `Clientes.json`, `Calificacion.json`, `locales/es|en.json`) y sin backend. Actualizar un dato = editar JSON + rebuild + redeploy manual. No existen rutas `/servicios`, `/proyectos`, `/blog` ni `/noticias`.

Objetivo: fuente única de verdad en **PostgreSQL externo** (el que pondrás en `.env` / Coolify), frontend Astro que se mantiene, backend liviano propio (Hono), rediseño de Servicios y Proyectos (teaser en `index` + páginas completas dedicadas), secciones **Blog y Noticias SEPARADAS** (`/blog` y `/noticias`, con teaser de 3 últimos de cada una en el index, cada entrada con 1 o más imágenes), mejora de Header y Hero, Footer intacto, uploads en **Cloudinary con compresión automática**, chatbot migrado al backend con `NVIDIA_API_KEY` como variable de entorno en Coolify, y despliegue único con **Docker + GitHub + Coolify en tu servidor (nada de Vercel)**. Las migraciones corren solas al arrancar el contenedor.

Cada fase deja el sistema funcionando.

## Diagnóstico actual (verificado en código)

- `astro.config.mjs`: `output: 'static'` → no hay SSR. Hay que migrar a `hybrid` + `@astrojs/node`.
- `src/pages/index.astro`: compone Header/Hero/Expertise/Projects/TechStack/Clients/Testimonials/Footer. Todo prerendered, datos importados en build-time.
- `src/components/Expertise.astro`: 4 servicios fijos (`s1..s4`), grid desktop + slider móvil. Click abre `ServiceModal` con datos de `services.json`.
- `src/components/Projects.astro`: contenedor vacío que se llena vía JS client-side importando `Proyectos.json`. Sin paginación, sin slug, sin SEO por proyecto.
- `src/components/Header.astro`: solo 2 links (`#expertise`, `#work`), anclas del index. Necesita nav real a `/servicios`, `/proyectos`, `/blog`, `/noticias`.
- `src/components/Hero.astro`: canvas matrix + `RobotScene` (Three). Mejorable sin romper performance.
- `src/data/site.json`: contacto + sociales → tabla `site_settings`.
- `worker/src/index.js` (chatbot NEURO): hoy llama a NVIDIA (`integrate.api.nvidia.com`) desde un **Cloudflare Worker** con `NVIDIA_API_KEY` como secret de wrangler, y el front lo usa vía `PUBLIC_CHAT_WORKER_URL` (.env actual apunta a `*.workers.dev`). Decisión: **migrar ese endpoint al backend Hono como `POST /api/chat`**, con `NVIDIA_API_KEY` en env de Coolify. El Worker queda deprecado (no se borra hasta verificar la migración). Beneficios: un servicio menos, el system-prompt se arma desde Postgres (servicios/proyectos siempre actualizados, hoy lee los JSON), y todo queda en tu servidor.
- Carpeta `.vercel/` existe pero **se ignora**: deploy único GitHub → Coolify en tu servidor (web Astro + api Hono). Nada de Vercel.

## Architecture Decisions

### 1. Backend: API propia Hono + Drizzle + PostgreSQL externo (confirmado)

Stack: `apps` en un solo repo — `src/` (Astro) + `api/` (Hono + Drizzle + Zod + `jose` JWT + `bcryptjs`).

```
┌─────────────┐     HTTP/JSON     ┌──────────────┐     SQL      ┌───────────────┐
│ Astro 7 Web │ ───────────────▶ │  API Hono    │ ───────────▶ │ Postgres      │
│ hybrid SSR  │ ◀─────────────── │  Node 22     │ ◀─────────── │ EXTERNO       │
│ + /admin UI │   Zod validado   │  Drizzle ORM │              │ (tu DATABASE_ │
└─────────────┘                  │  /api/chat ──┼──▶ NVIDIA   │  URL, volumes  │
       │                         │  /api/upload─┼──▶ Cloudi-  │  NO gestiona   │
       └──── fetch + fallback ───┘  nary        │   nary      │  Coolify)      │
```

Por qué Hono+Drizzle: liviano para tu VPS, TypeScript end-to-end, migraciones SQL puras, build rápido en Docker. Sin Strapi/Payload/Directus/Supabase (peso, costo o lock-in innecesarios para 7 tablas).

### 2. PostgreSQL externo + migración automática al desplegar (confirmado)

- Tú pones tu Postgres externo en `DATABASE_URL` (local en `.env`, prod en variables de Coolify — **nunca en el repo**).
- La API, al arrancar (`entrypoint.sh`: `drizzle-kit migrate` → `node dist/index.js`), **aplica migraciones pendientes sola**, idempotente. Si el contenedor reinicia, no duplica nada.
- Seed (`npm run db:seed`) solo inserta si las tablas están vacías (guard `SELECT count`), importa los JSON actuales. En Coolify se ejecuta una vez como job manual, NO en cada arranque.
- Coolify **no gestiona** Postgres (es externo): solo guarda la `DATABASE_URL` como variable secreta.

### 3. Uploads dual: local en dev, Cloudinary en prod (confirmado)

- Abstracción de storage con `STORAGE_DRIVER=local|cloudinary`. El admin siempre sube al mismo `POST /api/upload` (límite 8MB, solo jpg/png/webp, campo `tipo`: servicios|proyectos|blog|noticias|misc).
- Dev (`local`): guarda en `uploads/<tipo>/` y la API lo sirve en `/uploads/*`. Cero cuentas, cero costo, iteration rápida contra tu Postgres local.
- Prod (`cloudinary` en Coolify): reenvía con SDK y transformaciones fijas `fetch_format: auto, quality: auto, width: 1600, crop: limit` + thumb 800px. Compresión y formato moderno automáticos.
- En DB: `imagenes[]` guarda path (`/uploads/blog/x.webp`) o `secure_url` según driver; `imagen_ids[]` guarda `public_id` (solo Cloudinary, para `destroy` al borrar).
- Env: `STORAGE_DRIVER`, `UPLOAD_DIR=uploads`, `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET`, `CLOUDINARY_FOLDER=hieyson`.

### 4. Blog y Noticias SEPARADOS (confirmado)

Una sola tabla `posts` con `type TEXT CHECK (type IN ('blog','noticia'))` (mismo admin, mismo upload, menos código), pero **rutas, listados y teasers separados**:

```
/blog            → solo type=blog      /noticias            → solo type=noticia
/blog/[slug]     → ficha blog          /noticias/[slug]     → ficha noticia
index → teaser "Últimos blogs" (3) + teaser "Últimas noticias" (3), independientes
```

Cada post: `cover` + `imagenes TEXT[]` (1 o más), `tags[]`, `published_at`, autor, contenido markdown es/en.

### 5. Modelo de datos PostgreSQL (fuente única)

```sql
site_settings(key TEXT PK, value JSONB)
services(id TEXT PK, slug UNIQUE, icon, category_es/en, title_es/en,
         human_title_es/en, desc_es/en, examples JSONB, cta_*, order INT, published BOOL)
projects(id TEXT PK, slug UNIQUE, categoria_es/en, titulo_listado_es/en,
         descripcion_listado_es/en, descripcion_full_es/en, tecnologias TEXT[],
         imagenes TEXT[], imagen_ids TEXT[], destacado BOOL, order INT, published BOOL)
posts(id UUID PK, slug UNIQUE, type CHECK (type IN ('blog','noticia')),
      title_es/en, excerpt_es/en, content_md_es/en, cover TEXT, cover_id TEXT,
      imagenes TEXT[], imagen_ids TEXT[], tags TEXT[],
      published BOOL, published_at TIMESTAMPTZ, author TEXT)
testimonials, clients (desde Calificacion.json / Clientes.json)
users(id UUID PK, email UNIQUE, password_hash TEXT)  -- solo tú
contact_messages(id UUID PK, name TEXT, email TEXT, message TEXT, source TEXT DEFAULT 'footer',
                 lang TEXT DEFAULT 'es', status TEXT DEFAULT 'new' CHECK (status IN ('new','read','replied','archived')),
                 created_at TIMESTAMPTZ DEFAULT now())
```
Storage: dev = archivos en `uploads/<tipo>/`; prod = URLs Cloudinary. `imagenes[]` guarda path o URL según driver; `imagen_ids[]` solo Cloudinary. Detalle en `specs/content-model.md`.

### 6. Rutas finales

```
/                  → Hero nuevo + teaser Servicios (4) + teaser Proyectos (3 destacados)
/                  + teaser Blog (3) + teaser Noticias (3) + resto actual
/servicios         → grid completo + filtros categoría
/servicios/[slug]  → ficha completa + relacionados + CTA WhatsApp
/proyectos         → destacados + grid + filtros tech/categoría
/proyectos/[slug]  → galería Cloudinary + stack + resultados + relacionados
/blog + /blog/[slug]         → listado y ficha solo blogs
/noticias + /noticias/[slug] → listado y ficha solo noticias
/api/chat          → chatbot NEURO (NVIDIA, system-prompt desde Postgres)
/api/contact       → formulario de contacto (valida + honeypot + rate-limit, guarda en contact_messages)
/admin             → hieyson.com/admin: login + CRUD + uploads + inbox de contacto + revalidate
```

### 7. Docker + Coolify en tu servidor (sin Vercel)

- `Dockerfile.web` (Astro standalone) + `Dockerfile.api` (Hono + entrypoint con migrate) + `compose.yml` local (web+api; la DB es tu Postgres externo también en dev, o un Postgres local opcional).
- En Coolify: **2 servicios** (web, api) desde el mismo repo GitHub + variables. Postgres y Cloudinary son externos. El admin vive en **`hieyson.com/admin`** (misma app Astro, guard SSR por cookie JWT): un solo dominio, un solo SSL, cero CORS extra. `admin.hieyson.com` como subdominio separado NO se recomienda (servicio/dominio/SSL extra sin beneficio para 1 usuario).
- Variables Coolify — servicio `api`: `DATABASE_URL` (prod externa, secreta), `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (solo primer arranque), `STORAGE_DRIVER=cloudinary`, `CLOUDINARY_*` (4), `NVIDIA_API_KEY` (secreta), `CORS_ORIGIN=https://hieyson.com`, `NODE_ENV=production`. Servicio `web`: `API_URL=http://api:3001` (red interna Coolify), `PUBLIC_SITE_URL=https://hieyson.com`.
- En local: tu Postgres local (`DATABASE_URL` en `.env`), `STORAGE_DRIVER=local`, se desarrolla con `npm run dev` en cada carpeta (ya es una app, no un static site); Docker solo para verificar paridad prod.
- El front llama a la API por red interna (`API_URL`) en SSR y expone solo lo público al cliente. El chat usa misma-origin `/api/chat` (rewrite en web o CORS estricto) → `PUBLIC_CHAT_WORKER_URL` desaparece del `.env`.

---

## Task List

### Fase 0: Preparación (1 tarde)

#### Task 1: Saneamiento Git + baseline
**Description:** `.env.example` completo (todas las vars sin secretos), `README.md` con flujo GitHub→Coolify, tag baseline. `.gitignore` ya ignora `.env` — verificar.
**Acceptance criteria:**
- [ ] `.env.example` incluye `DATABASE_URL`, `API_URL`, `JWT_SECRET`, `ADMIN_*`, `CLOUDINARY_*`, `NVIDIA_API_KEY`, `PUBLIC_SITE_URL`
- [ ] `npm run build` pasa en limpio; tag `v1-static-baseline` creado
**Verification:** build OK; `git status` limpio.
**Dependencies:** None — **Files:** `.env.example`, `README.md` — **Scope:** Small

#### Task 2: Spec congelado de contenido y rutas
**Description:** `specs/content-model.md`: 7 tablas, campos es/en, slugs, decisión blog↔noticias separados firmada, galerías 1..N.
**Acceptance criteria:**
- [ ] Spec revisado por ti. Sin esto no se toca la DB.
**Verification:** Revisión humana. — **Dependencies:** Task 1 — **Scope:** Small

### Checkpoint CP0: build limpio + spec firmado.

### Fase 1: Backend + PostgreSQL (fundación)

#### Task 3: Scaffold `api/` Hono + Drizzle + entrypoint con migrate
**Description:** Hono, Drizzle, Zod, `src/routes|db|middleware|lib`, `entrypoint.sh` (migrate → start), `Dockerfile.api`, `compose.yml` apuntando a tu Postgres externo.
**Acceptance criteria:**
- [ ] `GET /health` OK; `docker compose up api` con `DATABASE_URL` externa aplica migraciones y arranca sin error
- [ ] Reinicio del contenedor no falla ni duplica (migrate idempotente)
**Verification:** `curl localhost:3001/health`; logs muestran `migrate OK`; restart OK. — **Dependencies:** Task 2 — **Scope:** Medium

#### Task 4: Schema + seed desde JSONs (idempotente)
**Description:** 8 tablas (7 contenido + `contact_messages` vacía) + `seed.ts` (upsert por slug, solo si vacío) importando services/Proyectos/Clientes/Calificacion/site.
**Acceptance criteria:**
- [ ] 4 servicios, N proyectos/clientes/testimonios verificados por conteo; seed x2 sin duplicados
**Verification:** `SELECT count(*)` por tabla. — **Dependencies:** Task 3 — **Scope:** Medium

#### Task 5: Endpoints públicos de lectura
**Description:** `GET /api/services[/:slug]`, `/api/projects[/:slug]` (`?destacado`), `/api/blog`, `/api/noticias` (alias de `/api/posts?type=`), `/api/posts/:slug`, `/api/site-settings`, `/api/testimonials`, `/api/clients`. Solo `published`, `?lang=`, paginación.
**Acceptance criteria:**
- [ ] 404 JSON en slug inexistente; 400 en `type` inválido; <150ms local
**Verification:** `vitest api/tests/public.test.ts`. — **Dependencies:** Task 4 — **Scope:** Medium

#### Task 5b: `POST /api/contact` (formulario funcional)
**Description:** Endpoint público con Zod (name/email/message, max 2000 chars), honeypot `company`, rate-limit 10/min/IP, guarda en `contact_messages` y responde OK genérico (no filtra si existe). El form del Footer (hoy `onsubmit=preventDefault` sin efecto) se cablea a este endpoint con estados éxito/error.
**Acceptance criteria:**
- [ ] Spam básico (honeypot lleno, >10/min) → 200 falso o 429 sin guardar; mensaje válido → fila `new` en DB
- [ ] Footer muestra confirmación sin recargar, i18n es/en
**Verification:** Tests `api/tests/contact.test.ts` + envío manual. — **Dependencies:** Task 4 — **Scope:** Small

#### Task 6: Auth admin + CRUD + upload dual (local/Cloudinary)
**Description:** Login JWT httpOnly + `requireAdmin`, CRUD de contenido (`contact_messages` solo lectura + cambio de estado + borrado, jamás se crea desde admin), `POST /api/upload` con abstracción de storage (`local` → `uploads/<tipo>/` + static `/uploads/*`; `cloudinary` → transform + `secure_url/public_id` + `destroy` al borrar). `STORAGE_DRIVER` por env.
**Acceptance criteria:**
- [ ] Sin cookie → 401; upload `.exe` o >8MB → 400; en local el archivo aparece en `uploads/<tipo>/`; en prod (mock Cloudinary) se guarda URL+public_id
**Verification:** `vitest api/tests/admin.test.ts` + subida manual. — **Dependencies:** Task 5 — **Scope:** Medium

#### Task 6b: `POST /api/chat` (migra el Worker) + knowledge desde Postgres
**Description:** Portar `worker/src/index.js` (rate-limit, validación, fallback de modelos NVIDIA) a Hono; system-prompt armado desde DB (servicios/proyectos/contacto) en vez de JSON; `NVIDIA_API_KEY` desde env.
**Acceptance criteria:**
- [ ] Responde igual que el Worker con la misma key; sin key → 500 controlado; rate-limit 20/min/IP
- [ ] Front usa `/api/chat` (misma origin), `PUBLIC_CHAT_WORKER_URL` eliminado
**Verification:** Tests `api/tests/chat.test.ts` (mock fetch NVIDIA) + chat manual es/en. — **Dependencies:** Task 6 — **Scope:** Medium

### Checkpoint CP1: compose up + tests verdes + seed verificado + chat responde.

### Fase 2: Integración Astro ↔ API

#### Task 7: `src/lib/cms.ts` con fallback + modo hybrid
**Description:** Cliente tipado (fetch API + fallback JSON local), `@astrojs/node`, `output: hybrid`.
**Acceptance criteria:**
- [ ] Con API caída, dev y build funcionan (warn, no crash); con API viva, edición en DB aparece en web
**Verification:** Apagar api → build OK; editar título → visible. — **Dependencies:** Task 6b — **Scope:** Small

### Fase 3: Servicios (rediseño)

#### Task 8: Teaser index (4) rediseñado
**Description:** Nuevo `Expertise.astro` (numeración, hover glow, `Ver todos → /servicios`), modal y slider móvil intactos.
**Acceptance criteria:**
- [ ] 4 desde API; dark/light OK. — **Verification:** screenshots. — **Dependencies:** Task 7 — **Scope:** Medium

#### Task 9: `/servicios` + `/servicios/[slug]`
**Description:** Listado con filtros + ficha (examples, proceso, relacionados, CTA WhatsApp, JSON-LD Service).
**Acceptance criteria:**
- [ ] SEO ≥95 ambas rutas; 404 real en slug inexistente. — **Dependencies:** Task 8 — **Scope:** Medium

### Checkpoint CP2: index→/servicios→/[slug]→WhatsApp en es/en.

### Fase 4: Proyectos (rediseño)

#### Task 10: Teaser index (3 destacados)
**Description:** `Projects.astro` con `?destacado&limit=3`, scrim legible light/dark.
**Acceptance criteria:**
- [ ] Cambiar destacado en admin → index refleja. — **Dependencies:** Task 9 — **Scope:** Small

#### Task 11: `/proyectos` + `/proyectos/[slug]` con galería Cloudinary
**Description:** Filtros tech/categoría + ficha con galería `imagenes[]`, JSON-LD, breadcrumbs; `#work` no se rompe.
**Acceptance criteria:**
- [ ] Galería con N imágenes Cloudinary; filtros reales. — **Dependencies:** Task 10 — **Scope:** Medium

### Checkpoint CP3: flujo proyectos end-to-end + decisión modal-vs-ficha.

### Fase 5: Blog y Noticias SEPARADOS

#### Task 12: `/blog` + `/blog/[slug]` (solo type=blog)
**Description:** Listado con search + tags + cards con cover; ficha markdown saneado + galería + relacionados + RSS `/blog/rss.xml`.
**Acceptance criteria:**
- [ ] Crear blog en admin (2+ imágenes) → visible sin deploy manual; XSS `<script>` neutralizado
**Verification:** post prueba + `curl rss`. — **Dependencies:** Task 11 — **Scope:** Medium

#### Task 12b: `/noticias` + `/noticias/[slug]` (solo type=noticia)
**Description:** Espejo de blog para noticias (listado + ficha + RSS `/noticias/rss.xml`), mismo componente base parametrizado por `type`.
**Acceptance criteria:**
- [ ] Blog y noticia no se mezclan en ningún listado. — **Dependencies:** Task 12 — **Scope:** Small

#### Task 13: Teasers index (3 blogs + 3 noticias)
**Description:** Dos bloques independientes (o tabs) con últimos 3 de cada tipo + links a `/blog` y `/noticias`; se ocultan si vacíos; LCP +0.3s máx.
**Acceptance criteria:**
- [ ] Con 0 noticias y 2 blogs: solo aparece bloque blog con 2. — **Dependencies:** Task 12b — **Scope:** Small

### Fase 6: Header + Hero (footer no se toca)

#### Task 14: Header con nav real (Servicios/Proyectos/Blog/Noticias/Contacto)
**Description:** Rutas reales, activo por pathname (incluye `[slug]`), móvil a11y, i18n completo.
**Acceptance criteria:**
- [ ] 6 rutas x2 idiomas navegables; Axe sin críticos. — **Dependencies:** Task 13 — **Scope:** Small

#### Task 15: Hero bacán sin matar perf
**Description:** Rotativa sin CLS, doble CTA, prueba social, badges, marquee clientes, matrix throttled/off móvil, textos desde `site_settings`.
**Acceptance criteria:**
- [ ] LCP móvil ≤2.5s; reduced-motion OK. — **Dependencies:** Task 14 — **Scope:** Medium

### Checkpoint CP4: recorrido 6 rutas x2 idiomas + footer intacto + Lighthouse.

### Fase 7: Admin + Docker + Coolify

#### Task 16: `/admin` (auth + CRUD + upload Cloudinary + preview markdown)
**Description:** 16a auth+layout; 16b CRUD servicios/proyectos (galerías); 16c CRUD blog/noticias (editor md + galería) + testimonios/clientes/settings + **inbox contacto** (`/admin/mensajes`: bandeja con filtros por estado new/read/replied/archived, ver, marcar, borrar) + botón revalidate.
**Acceptance criteria:**
- [ ] Flujo completo sin tocar código ni SQL, con usuario no-técnico. — **Dependencies:** Task 15 — **Scope:** Large (3 sub-slices)

#### Task 17: Docker final + compose prod-like
**Description:** `Dockerfile.web`, `Dockerfile.api` (entrypoint migrate), `.dockerignore`, `compose.yml`, HEALTHCHECKs, no-root, <300MB, sin secretos horneados.
**Acceptance criteria:**
- [ ] `docker compose up --build` desde cero OK; `docker history` sin secretos. — **Dependencies:** Task 16 — **Scope:** Medium

#### Task 18: Coolify (2 servicios + envs + dominios + SSL + auto-deploy)
**Description:** Repo a GitHub `main`, servicios web+api, variables según §7, dominios, SSL, auto-deploy, webhook revalidate (<60s edición→prod).
**Acceptance criteria:**
- [ ] Push → deploy solo; edición en `/admin` visible en prod <60s; `https://hieyson.com` + health API verdes
**Verification:** deploy real + edición end-to-end. — **Dependencies:** Task 17 — **Scope:** Medium

### Checkpoint CP5 (launch): rollback 1-click, monitoreo uptime, backup Postgres externo verificado (tu política), 404s.

### Fase 8: Endurecimiento

#### Task 19: SEO+a11y+perf pass
**Description:** Sitemap (incluye blog+noticias), robots, canonicals, OG, JSON-LD, alts, lazy galerías.
**Acceptance criteria:**
- [ ] Lighthouse ≥90 perf / ≥95 SEO en `/`, `/servicios`, `/blog/[slug]`, `/noticias/[slug]`; CI verde. — **Dependencies:** Task 18 — **Scope:** Small

---

## Orden de ejecución

```
0. Git + spec (CP0)
1. api + migrate-on-boot + seed (CP1 con chat incluido)
2. cms.ts + hybrid (primer dato vivo)
3. Servicios teaser → /servicios → /[slug] (CP2)
4. Proyectos teaser → /proyectos → /[slug] galería (CP3)
5. /blog → /noticias → teasers 3+3 + RSS
6. Header → Hero (CP4, footer intacto)
7. /admin → Docker → Coolify (CP5)
8. SEO/a11y/perf
```

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| static→hybrid rompe algo | Alto | Rama `feat/backend`, `main` intacta hasta CP5 |
| Postgres externo caído/credencial mala | Alto | `cms.ts` fallback a JSON; healthcheck API; entrypoint reintenta migrate 5x con backoff |
| Traducción es/en incompleta bloquea publish | Medio | Admin bloquea Publicar si falta `*_es` o `*_en` |
| Hero 3D mata LCP | Medio | Baseline Lighthouse antes; lazy canvas, off en <768px |
| Cloudinary cuota/límites | Medio | Compresión `q_auto` + `w_1600` siempre; carpeta única; eager solo 1 thumb; aviso de uso en admin |
| Scope creep | Alto | Congelado: solo Servicios, Proyectos, Header, Hero, Blog, Noticias. Resto = solo cambio de fuente |

## Decisiones ya tomadas (no reabrir)

1. Blog y Noticias **separados** (`/blog`, `/noticias`), teasers 3+3 en index, galería 1..N. ✔
2. Uploads en **Cloudinary** con compresión automática. ✔
3. Deploy **solo Coolify en tu servidor** desde GitHub. Vercel fuera. ✔
4. Chatbot al backend (`/api/chat`), `NVIDIA_API_KEY` en env de Coolify. Worker deprecado. ✔
5. Postgres **externo**, migraciones automáticas al arrancar. ✔
6. Storage dual: `uploads/<tipo>/` en local, Cloudinary en prod (`STORAGE_DRIVER`). ✔
7. Admin en `hieyson.com/admin` (misma app, sin subdominio). ✔
8. Formulario de contacto funcional + bandeja en admin (`contact_messages`). ✔

## Estimación

- Fases 0-2: 3-5 días. Fases 3-5: 6-9 días (una ruta extra: noticias). Fase 6: 2-3 días. Fase 7: 4-6 días. Total 3-4 semanas con checkpoints.
