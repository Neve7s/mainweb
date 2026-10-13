import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './db/client';

// Corre las migraciones pendientes de ./drizzle (idempotente).
// Lo usa entrypoint.sh al arrancar el contenedor en Coolify.
async function main() {
  await migrate(db, { migrationsFolder: './drizzle' });
  // eslint-disable-next-line no-console
  console.log('[migrate] OK');
  await pool.end();
}

main().catch((err) => {
  console.error('[migrate] FAILED', err);
  process.exit(1);
});
