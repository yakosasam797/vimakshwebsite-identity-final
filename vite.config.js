import { defineConfig } from 'vite';
import { resolve } from 'node:path';
const page = p => resolve(__dirname, p);
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: { input: {
      main: page('index.html'), services: page('services/index.html'), about: page('about/index.html'),
      careers: page('careers/index.html'), contact: page('contact/index.html'),
      paryatech: page('work/paryatech/index.html'), wingman: page('work/wingman/index.html'),
    } },
  },
});
