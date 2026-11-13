import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// base './' lets the build be hosted anywhere (GitHub Pages, Vercel, ...).
// `npm run dev:ssl` serves https on the LAN, which WebXR needs when testing on a Quest.
export default defineConfig({
  base: './',
  plugins: process.env.SSL ? [basicSsl()] : [],
  server: { host: true, port: 5173, proxy: { '/api/agent': 'http://localhost:8787' } },
  build: { chunkSizeWarningLimit: 1200 },
});
