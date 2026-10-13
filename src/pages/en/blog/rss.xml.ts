import { buildRss } from '../../../lib/rss';

export const prerender = false;

export async function GET() {
  return buildRss({
    type: 'blog',
    lang: 'en',
    title: 'HieysoN Blog',
    link: 'https://hieyson.com/en/blog',
    desc: 'Software, AI and automation guides.',
  });
}
