import { defineConfig } from 'vite';
import { resolve } from 'node:path';
const page = p => resolve(__dirname, p);
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: { input: {
      main: page('index.html'),
      contact: page('contact/index.html'),
    } },
  },
});
