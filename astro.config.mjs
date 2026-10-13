// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

import node from '@astrojs/node';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://hieyson.com',
  // En Astro 7 'static' + adapter = híbrido: prerender por defecto,
  // SSR por página con `export const prerender = false` (/admin).
  output: 'static',

  vite: {
    plugins: [tailwindcss()],
  },

  adapter: node({
    mode: 'standalone',
  }),

  integrations: [sitemap()],
});