import { buildRss } from '../../lib/rss';

export const prerender = true;

export async function GET() {
  return buildRss({
    type: 'noticia',
    lang: 'es',
    title: 'HieysoN Noticias',
    link: 'https://hieyson.com/noticias',
    desc: 'Lanzamientos y novedades de HieysoN.',
  });
}
