# Deploy a producción: GitHub → Coolify (tu servidor)

Arquitectura en prod: **2 servicios** en Coolify (`web` Astro + `api` Hono) + **Postgres externo** (el de tu servidor) + **Cloudinary** (uploads). Nada de Vercel.

## 0. Preparar el repo (una vez)

```sh
git remote add origin git@github.com:<tu-usuario>/nosyeihweb-astro.git
git push -u origin main
```

Tamaños verificados localmente (`docker compose up --build`): api ~277MB, web ~670MB. Ambas corren como usuario no-root con healthchecks.

## 1. DNS (tu proveedor de dominio)

| Host | Tipo | Valor |
|------|------|-------|
| `hieyson.com` | A | IP de tu servidor |
| `api.hieyson.com` | A | IP de tu servidor |

Espera propagación (`nslookup hieyson.com`). Baja el TTL a 300 antes del corte si migras desde otro hosting.

## 2. Servicio `api` en Coolify

- Nuevo recurso → Dockerfile → repo `main`, Dockerfile `Dockerfile.api`.
- Puerto: `3001`. Dominio: `https://api.hieyson.com` (SSL automático).
- Variables (todas en el panel de Coolify, nunca en el repo):

| Key | Valor |
|-----|-------|
| `DATABASE_URL` | `postgres://USER:PASS@HOST:5432/hieyson` (tu Postgres del servidor; si es contenedor en el mismo host usa su hostname interno) |
| `JWT_SECRET` | secreto largo (≥32 chars, distinto al de dev) |
| `ADMIN_EMAIL` | tu email |
| `ADMIN_PASSWORD` | clave inicial (úsala una vez y cámbiala) |
| `STORAGE_DRIVER` | `cloudinary` |
| `CLOUDINARY_CLOUD_NAME` / `API_KEY` / `API_SECRET` | de tu cuenta Cloudinary |
| `CLOUDINARY_FOLDER` | `hieyson` |
| `NVIDIA_API_KEY` | la misma del Worker (`nvapi-…`) — el Worker de Cloudflare se puede apagar cuando verifiques `/api/chat` en prod |
| `CORS_ORIGIN` | `https://hieyson.com` |
| `NODE_ENV` | `production` |

- Deploy. Verifica `https://api.hieyson.com/health` → `{"ok":true,"db":"up"}`.
- La API **migra sola** al arrancar (entrypoint). Seed inicial (una sola vez, desde la terminal de Coolify en el contenedor api):

```sh
node dist/seed.js
```

Crea las 8 tablas de contenido + tu usuario admin. Idempotente: no duplica.

## 3. Servicio `web` en Coolify

- Nuevo recurso → Dockerfile → mismo repo `main`, Dockerfile `Dockerfile.web`.
- Puerto: `4321`. Dominio: `https://hieyson.com` (SSL automático).
- Variables:

| Key | Valor |
|-----|-------|
| `API_URL` | `https://api.hieyson.com` (el build la usa para traer datos vivos; si falla, compila con los JSON locales) |
| `PUBLIC_API_URL` | `https://api.hieyson.com` (formulario de contacto en el navegador) |
| `PUBLIC_SITE_URL` | `https://hieyson.com` |
| `NODE_ENV` | `production` |
| `COOLIFY_REDEPLOY_HOOK` | (opcional, paso 5) webhook de redeploy de este servicio |

- Deploy. Verifica `https://hieyson.com/api/health` → `{"ok":true}`.

## 4. Auto-deploy

En cada servicio Coolify → activa auto-deploy desde GitHub (`main`). Cada `push` redespliega. Rollback = redeploy de un commit anterior (1 click en el historial del servicio).

## 5. Publicar cambios del admin (botón Republicar)

El contenido prerendered se congela en el build. Flujo:

1. Editas en `https://hieyson.com/admin` (va directo a Postgres).
2. Botón **Republicar sitio** en el dashboard → llama al webhook de redeploy del servicio `web` → rebuild con datos frescos (~2-4 min).
3. Para el webhook: en Coolify (servicio web → Webhooks) crea uno de redeploy y pégalo en `COOLIFY_REDEPLOY_HOOK` del servicio web.

## 6. Backups y monitoreo

- **Postgres**: tu política del servidor (pg_dump diario + retención). Prueba un restore antes del corte. La app no gestiona backups al ser Postgres externo.
- **Monitoreo**: Uptime Kuma o similar contra `https://hieyson.com/api/health` y `https://api.hieyson.com/health`.
- **Imágenes**: viven en Cloudinary (carpeta `hieyson/`), fuera del VPS.

## 7. Checklist de corte

- [ ] `/health` verde en ambos servicios
- [ ] Login en `/admin` con las credenciales prod
- [ ] Crear + publicar un post de prueba → Republicar → visible → borrarlo
- [ ] Formulario de contacto crea mensaje en `/admin/mensajes`
- [ ] Chat responde (usa `NVIDIA_API_KEY` de Coolify)
- [ ] `http://` redirige a `https://` (Coolify lo hace por defecto)
- [ ] Restore de backup Postgres probado
