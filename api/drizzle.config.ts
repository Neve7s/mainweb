import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Dev local: lee el .env de la raíz del repo. En Docker/Coolify las vars ya vienen del entorno.
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
