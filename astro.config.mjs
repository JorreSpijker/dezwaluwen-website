// @ts-check
import { defineConfig, envField } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';

const secret = { context: /** @type {const} */ ('server'), access: /** @type {const} */ ('secret'), optional: true };

// Site blijft statisch; alleen /beheer en /api/beheer draaien server-side (prerender = false)
export default defineConfig({
  adapter: vercel(),
  // Astro 7 haalt standaard spaties tussen inline-elementen weg ('jsx'); true = gedrag Astro 6
  compressHTML: true,
  integrations: [react()],
  // Instellingen voor /beheer; zie .env.example
  env: {
    schema: {
      AUTH_SECRET: envField.string(secret),
      OWNER_EMAILS: envField.string(secret),
      GOOGLE_CLIENT_ID: envField.string(secret),
      GOOGLE_CLIENT_SECRET: envField.string(secret),
      GITHUB_TOKEN: envField.string(secret),
      GITHUB_REPO: envField.string({ ...secret, default: 'JorreSpijker/dezwaluwen-website' }),
      GITHUB_BRANCH: envField.string({ ...secret, default: 'main' }),
    },
  },
});
