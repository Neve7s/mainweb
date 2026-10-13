import { getPosts } from './cms';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function buildRss(opts: {
  type: 'blog' | 'noticia';
  lang: 'es' | 'en';
  title: string;
  link: string;
  desc: string;
}): Promise<Response> {
  const { items } = await getPosts(opts.type, opts.lang, { limit: 50 });
  const site = opts.lang === 'es' ? 'https://hieyson.com' : 'https://hieyson.com/en';
  const section = opts.type === 'blog' ? 'blog' : 'noticias';
  const itemsXml = items
    .map((p) => {
      const url = `${site}/${section}/${p.slug}`;
      return `<item><title>${esc(p.title)}</title><link>${url}</link><guid>${url}</guid><description>${esc(p.excerpt)}</description><pubDate>${p.published_at ? new Date(p.published_at).toUTCString() : ''}</pubDate></item>`;
    })
    .join('');
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0"><channel><title>${esc(opts.title)}</title><link>${opts.link}</link><description>${esc(opts.desc)}</description>${itemsXml}</channel></rss>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
