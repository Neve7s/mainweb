import { serve } from '@hono/node-server';
import { app } from './app';

// Diagnóstico temprano: estos fallos daban 500 crípticos ("Internal error").
// Se avisa en el log del arranque en vez de romper login/reset en runtime.
function checkEnv() {
  const problems: string[] = [];
  if (!process.env.DATABASE_URL) problems.push('DATABASE_URL ausente');
  if ((process.env.JWT_SECRET || '').length < 32) {
    problems.push('JWT_SECRET ausente o menor a 32 chars (login y reset darán 500)');
  }
  if (process.env.NODE_ENV === 'production' && (process.env.APP_URL || '').includes('localhost')) {
    problems.push('APP_URL con localhost en production (los links de email saldrán mal)');
  }
  for (const p of problems) console.error(`[env] ${p}`);
}

const port = Number(process.env.PORT || 3001);
checkEnv();
serve({ fetch: app.fetch, port });
// eslint-disable-next-line no-console
console.log(`[api] listening on :${port} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
