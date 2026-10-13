# TODO — HieysoN Web: Backend + Rediseño + Blog/Noticias + Docker/Coolify

> Fuente: `tasks/plan.md`. Un `in_progress` a la vez. Marcar solo con verificación pasada.

## Fase 0: Preparación
- [x] Task 1: Saneamiento Git + `.env.example` completo + tag `v1-static-baseline`
- [x] Task 2: Spec `specs/content-model.md` (blog↔noticias separados, galerías 1..N)

## Fase 1: Backend + PostgreSQL externo
- [x] Task 3: Scaffold `api/` + entrypoint migrate-on-boot + compose (health OK, restart idempotente)
- [x] Task 4: Schema 8 tablas (incl. `contact_messages` vacía) + seed idempotente
- [x] Task 5: Endpoints lectura (`/api/blog`, `/api/noticias` separados) + tests verdes
- [x] Task 5b: `POST /api/contact` (Zod + honeypot + rate-limit) + Footer cableado
- [x] Task 6: Auth + CRUD + upload dual (local `uploads/<tipo>/` | Cloudinary) + tests verdes
- [x] Task 6b: `POST /api/chat` NVIDIA desde Postgres + front misma-origin (Worker deprecado)

## Fase 2: Integración Astro
- [x] Task 7: `src/lib/cms.ts` fallback + adapter node (build OK con/sin API, dato vivo probado)

## Fase 3: Servicios
- [x] Task 8: Teaser desde CMS + CTA + `/servicios` es/en (modal temporal, sin rediseño visual aún)
- [x] Task 9: `/servicios/[slug]` ficha + filtros + JSON-LD (SEO ≥95)

## Fase 4: Proyectos
- [x] Task 10: Teaser 3 destacados en index (scrim light/dark)
- [x] Task 11: `/proyectos` + `/proyectos/[slug]` galería Cloudinary

## Fase 5: Blog y Noticias (separados)
- [x] Task 12: `/blog` + `/blog/[slug]` + RSS (galería 1..N, XSS neutralizado)
- [x] Task 12b: `/noticias` + `/noticias/[slug]` + RSS (no se mezclan)
- [x] Task 13: Teasers index 3 blogs + 3 noticias (ocultos si vacíos, LCP +0.3s máx)

## Fase 6: Header + Hero
- [x] Task 14: Header nav real (5 destinos, activo por ruta, a11y, i18n)
- [x] Task 15: Hero bacán (rotativa sin CLS, doble CTA, reduced-motion, LCP ≤2.5s)

## Fase 7: Admin + Ship
- [x] Task 16a: `/admin` auth + layout
- [x] Task 16b: CRUD servicios/proyectos (galerías Cloudinary)
- [x] Task 16c: CRUD blog/noticias (editor md) + settings + inbox contacto + revalidate
- [x] Task 17: Dockerfiles + compose (api 277MB, web ~670MB, no-root, sin secretos, healthchecks OK)
- [ ] Task 18: Coolify 2 servicios + envs + SSL + auto-deploy (edición→prod vía Republicar, 2-4 min)

## Fase 8: Endurecimiento
- [x] Task 19 (base): sitemap + JSON-LD + canonicals + OG + alts + lazy (Lighthouse manual pendiente en prod)

## Checkpoints (puertas)
- [x] CP0: build limpio + spec firmado
- [x] CP1: compose + tests + seed + chat OK
- [x] CP2: flujo servicios es/en
- [x] CP3: flujo proyectos (modal quick-view en home + fichas en /proyectos)
- [x] CP4: 6 rutas x2 idiomas + footer intacto
- [ ] CP5: rollback 1-click + monitoreo + backup PG externo verificado (lado Coolify, docs/deploy-coolify.md)

## Variables pendientes del dueño (Coolify/prod)
- [x] `DATABASE_URL` local en `.env` (lista y verificada)
- [ ] `DATABASE_URL` prod (tu Postgres del servidor) → variable en Coolify
- [ ] `CLOUDINARY_CLOUD_NAME` / `API_KEY` / `API_SECRET` → variables en Coolify
- [ ] `NVIDIA_API_KEY` (mover de wrangler secret a Coolify; Worker sigue vivo hasta verificar)
- [ ] `JWT_SECRET` prod + `ADMIN_EMAIL` / `ADMIN_PASSWORD` inicial → variables en Coolify
- [x] Dominios: `hieyson.com` (web) + `api.hieyson.com` (api)
