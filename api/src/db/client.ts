import * as dotenv from 'dotenv';
import * as path from 'path';

// Dev local: el .env vive en la raíz del repo (api/src/db -> raíz = 3 niveles).
// En Docker/Coolify las variables ya vienen inyectadas en el entorno.
dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

import { Pool } from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('[db] Falta DATABASE_URL (revísala en .env o en las variables de Coolify)');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });

export async function checkDb(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
