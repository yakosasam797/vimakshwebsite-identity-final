import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { cloudflare } from "@cloudflare/vite-plugin";
const page = p => resolve(__dirname, p);
// The pages belong to the browser build only; the Cloudflare plugin builds worker/index.js separately.
export default defineConfig({
  plugins: [cloudflare()],
  environments: {
    client: {
      build: {
        chunkSizeWarningLimit: 900,
        rollupOptions: { input: {
          main: page('index.html'),
          contact: page('contact/index.html'),
          terms: page('terms/index.html'), privacy: page('privacy/index.html'), cookies: page('cookies/index.html'),
        } },
      },
    },
  },
});
