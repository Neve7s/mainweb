import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { projects, services, siteSettings } from '../db/schema';

// Arma el system-prompt de NOSYEIH desde Postgres (siempre actualizado).
// Mismo tono/reglas que el Worker original (worker/src/index.js).
export async function buildKnowledge(lang: 'es' | 'en'): Promise<string> {
  const [svcRows, projRows, setRows] = await Promise.all([
    db.select().from(services).where(eq(services.published, true)).orderBy(services.order),
    db.select().from(projects).where(eq(projects.published, true)).orderBy(projects.order),
    db.select().from(siteSettings),
  ]);
  const settings: Record<string, any> = {};
  for (const r of setRows) settings[r.key] = r.value;
  const contact = (settings['contact'] ?? {}) as {
    email?: string;
    phoneDisplay?: string;
    whatsappUrl?: string;
  };
  const langLabel = lang === 'en' ? 'English' : 'Spanish';
  const svcNames = svcRows.map((s) => (lang === 'es' ? s.titleEs : s.titleEn));
  const projNames = projRows
    .slice(0, 12)
    .map(
      (p) =>
        `${lang === 'es' ? p.tituloListadoEs : p.tituloListadoEn} [${lang === 'es' ? p.categoriaEs : p.categoriaEn}]`,
    );

  const persona = `You are NOSYEIH, the sales assistant of HieysoN (hieyson.com), a software dev + AI company. Reply in ${langLabel}. Short and natural like WhatsApp, max 2-3 sentences. No lists or numbered things.`;
  const rules = `Rules:
- Services: ${svcNames.join(', ')}.
- We build in any technology: PHP, Python/Django, JavaScript, WordPress, etc. Never refuse a request.
- If they ask how something works in practice (equipment, offline, installation): answer briefly and honestly; if unsure, say the team can verify it and offer WhatsApp.
- Domain & hosting: if they have or ask about a domain, tell them we provide and manage it.
- For quotes or hiring: give WhatsApp link ${contact.whatsappUrl ?? ''}, asking at most one question first.
- Never invent prices or dates.`;

  return [
    persona,
    rules,
    ``,
    `Our services (short names only): ${svcNames.join(' | ')}`,
    ``,
    `Our projects (names only): ${projNames.join(' | ')}`,
    ``,
    `Contact: Email ${contact.email ?? ''} | Phone ${contact.phoneDisplay ?? ''} | WhatsApp ${contact.whatsappUrl ?? ''}`,
  ].join('\n');
}
