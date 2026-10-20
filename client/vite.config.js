import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 5173,
    host: true,
    watch: {
      ignored: ['**/public/**']
    }
  },
  build: {
    target: 'esnext',
    outDir: 'dist'
  }
});
