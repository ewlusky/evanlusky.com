import { defineConfig } from 'vite';

const port = Number(process.env.PORT) || 5173;

export default defineConfig({
  build: {
    target: 'es2022',
  },
  server: { port },
  preview: { port },
});
