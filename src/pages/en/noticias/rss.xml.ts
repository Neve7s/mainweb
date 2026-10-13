import { buildRss } from '../../../lib/rss';

export const prerender = true;

export async function GET() {
  return buildRss({
    type: 'noticia',
    lang: 'en',
    title: 'HieysoN News',
    link: 'https://hieyson.com/en/noticias',
    desc: 'HieysoN launches and updates.',
  });
}
