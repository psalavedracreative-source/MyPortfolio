// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Netlify sets URL at build time; SITE_URL lets you override it (e.g. a custom domain).
const site = process.env.SITE_URL || process.env.URL || 'https://patrickbrandgrowth.netlify.app';

export default defineConfig({
  site,
  output: 'static',
  devToolbar: { enabled: false },
  trailingSlash: 'ignore',
  build: { format: 'file' },
  integrations: [sitemap()],
  image: {
    responsiveStyles: false,
  },
  vite: {
    // Transformers.js is only ever loaded on demand, in the browser, when the chat opens.
    optimizeDeps: { exclude: ['@huggingface/transformers'] },
  },
});
