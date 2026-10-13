import { buildRss } from '../../lib/rss';

export const prerender = true;

export async function GET() {
  return buildRss({
    type: 'blog',
    lang: 'es',
    title: 'HieysoN Blog',
    link: 'https://hieyson.com/blog',
    desc: 'Guías de software, IA y automatización.',
  });
}
