# HieysoN Web — hieyson.com

Plataforma de HieysoN: frontend **Astro 7** + backend **Hono + Drizzle + PostgreSQL**. Fuente única de verdad en Postgres (servicios, proyectos, blog, noticias, testimonios, clientes, mensajes de contacto). Admin en `hieyson.com/admin`. Deploy: GitHub → Coolify en VPS propio.

## Estructura

```
src/            → Frontend Astro (hybrid SSR, i18n es/en)
api/            → Backend Hono (health, lectura pública, auth+CRUD, upload, chat IA)
api/drizzle/    → Migraciones SQL (se aplican solas al arrancar en prod)
specs/          → Spec congelado del modelo de contenido
tasks/          → Plan y checklist de implementación
worker/         → (deprecado) Worker Cloudflare del chat, migrado a POST /api/chat
uploads/        → Uploads locales en dev (STORAGE_DRIVER=local). En prod: Cloudinary.
```

## Desarrollo local

Requiere Node ≥22 y tu PostgreSQL local. Copia `.env.example` a `.env` y apunta `DATABASE_URL` a tu base `hieyson`.

```sh
# Terminal 1 — backend (http://localhost:3001, /health)
cd api && npm install && npm run dev

# Terminal 2 — frontend (http://localhost:4321)
npm install && npm run dev
```

Comandos API: `npm run db:generate` (nueva migración), `npm run db:migrate`, `npm run db:seed` (idempotente), `npm test`, `npm run build`.

## Deploy (Coolify)

Servicios `web` (Dockerfile.web) + `api` (Dockerfile.api, migra solo al arrancar). Postgres y Cloudinary son externos: sus credenciales van como variables en Coolify, nunca en el repo. Detalle en `tasks/plan.md` y `docs/deploy-coolify.md`.
