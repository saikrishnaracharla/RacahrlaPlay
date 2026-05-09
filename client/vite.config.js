import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * WHY the /saavn proxy:
 *  - The browser makes the HTTP request (real Chrome TLS fingerprint)
 *  - Cloudflare sees a genuine browser, not a Node.js server IP
 *  - The proxy rewrites /saavn/* → https://saavn.sumit.co/api/*
 *  - We inject Referer/Origin headers that saavn expects
 *
 * In production (Vercel):
 *  - vercel.json rewrites handle /saavn/* → saavn.sumit.co (same effect)
 *  - /auth/* → backend on Render (set VITE_BACKEND_URL in Vercel env vars)
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    proxy: {
      // ── Music API — browser sends directly to saavn.sumit.co ──────────────
      '/saavn': {
        target:      'https://saavn.sumit.co',
        changeOrigin: true,
        secure:       true,
        rewrite:     (path) => path.replace(/^\/saavn/, '/api'),
        configure:   (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Referer',         'https://www.jiosaavn.com/');
            proxyReq.setHeader('Origin',          'https://www.jiosaavn.com');
            proxyReq.setHeader('Accept-Language', 'en-IN,en;q=0.9,hi;q=0.8');
          });
        },
      },

      // ── Auth & Music fallback — Express backend ───────────────────────────
      '/auth': {
        target:       'http://localhost:5000',
        changeOrigin: true,
        secure:       false,
      },
      '/api': {
        target:       'http://localhost:5000',
        changeOrigin: true,
        secure:       false,
      },
      // JioSaavn direct DES-decrypt endpoint (see server/index.js /jio/search)
      '/jio': {
        target:       'http://localhost:5000',
        changeOrigin: true,
        secure:       false,
      },
    },
  },
});
