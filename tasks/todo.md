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
- [ ] Task 6b: `POST /api/chat` NVIDIA desde Postgres + front misma-origin (Worker deprecado)

## Fase 2: Integración Astro
- [x] Task 7: `src/lib/cms.ts` fallback + adapter node (build OK con/sin API, dato vivo probado)

## Fase 3: Servicios
- [x] Task 8: Teaser desde CMS + CTA + `/servicios` es/en (modal temporal, sin rediseño visual aún)
- [x] Task 9: `/servicios/[slug]` ficha + filtros + JSON-LD (SEO ≥95)

## Fase 4: Proyectos
- [x] Task 10: Teaser 3 destacados en index (scrim light/dark)
- [ ] Task 11: `/proyectos` + `/proyectos/[slug]` galería Cloudinary

## Fase 5: Blog y Noticias (separados)
- [ ] Task 12: `/blog` + `/blog/[slug]` + RSS (galería 1..N, XSS neutralizado)
- [ ] Task 12b: `/noticias` + `/noticias/[slug]` + RSS (no se mezclan)
- [ ] Task 13: Teasers index 3 blogs + 3 noticias (ocultos si vacíos, LCP +0.3s máx)

## Fase 6: Header + Hero
- [ ] Task 14: Header nav real (5 destinos, activo por ruta, a11y, i18n)
- [ ] Task 15: Hero bacán (rotativa sin CLS, doble CTA, reduced-motion, LCP ≤2.5s)

## Fase 7: Admin + Ship
- [ ] Task 16a: `/admin` auth + layout
- [ ] Task 16b: CRUD servicios/proyectos (galerías Cloudinary)
- [ ] Task 16c: CRUD blog/noticias (editor md) + settings + inbox contacto + revalidate
- [ ] Task 17: Dockerfiles + compose (<300MB, no-root, sin secretos)
- [ ] Task 18: Coolify 2 servicios + envs + SSL + auto-deploy (edición→prod <60s)

## Fase 8: Endurecimiento
- [ ] Task 19: SEO/a11y/perf (≥90/≥95, CI verde)

## Checkpoints (puertas)
- [x] CP0: build limpio + spec firmado
- [ ] CP1: compose + tests + seed + chat OK
- [ ] CP2: flujo servicios es/en
- [ ] CP3: flujo proyectos + decisión modal-vs-ficha
- [ ] CP4: 6 rutas x2 idiomas + footer intacto
- [ ] CP5: rollback 1-click + monitoreo + backup PG externo verificado

## Variables pendientes del dueño (para Fase 7, ver mensaje)
- [ ] `DATABASE_URL` local en `.env` (tu Postgres local, ej. `postgres://user:pass@localhost:5432/hieyson`); la de prod va en Coolify, nunca en el repo
- [ ] `CLOUDINARY_CLOUD_NAME` / `API_KEY` / `API_SECRET` (solo se usan en prod; en local `STORAGE_DRIVER=local`)
- [ ] `NVIDIA_API_KEY` (mover de wrangler secret a Coolify)
- [ ] `JWT_SECRET` + `ADMIN_EMAIL` / `ADMIN_PASSWORD` inicial
- [ ] Dominio web + subdominio/dominio API confirmados
