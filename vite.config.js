import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { cloudflare } from "@cloudflare/vite-plugin";
const page = p => resolve(__dirname, p);
export default defineConfig({
  plugins: [cloudflare()],
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: { input: {
      main: page('index.html'),
      contact: page('contact/index.html'),
      terms: page('terms/index.html'), privacy: page('privacy/index.html'), cookies: page('cookies/index.html'),
    } },
  },
});