import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load ALL .env vars (prefix '' = no filter, so N8N_API_KEY is included
  // without VITE_ prefix — it stays server-side only, never in the bundle).
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      host: true,
      // Single /n8n proxy — covers both the webhook and the REST API.
      // Mirrors the n8n_v5/dashboard vite.config.js approach which is
      // proven to work for long-running flows.
      proxy: {
        '/n8n': {
          target:       'https://n8n.justt.ai',
          changeOrigin: true,
          rewrite:      (path) => path.replace(/^\/n8n/, ''),
          secure:       true,
          headers: {
            'X-N8N-API-KEY': env.N8N_API_KEY || '',
          },
        },
      },
    },
  };
});
