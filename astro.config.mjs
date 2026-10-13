// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  // En Astro 7 'static' + adapter = híbrido: prerender por defecto,
  // SSR por página con `export const prerender = false` (/admin).
  output: 'static',

  vite: {
    plugins: [tailwindcss()],
  },

  adapter: node({
    mode: 'standalone',
  }),
});