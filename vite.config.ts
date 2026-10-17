import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { guardianProxyPlugin } from './plugins/guardianProxyPlugin';

export default defineConfig(({ mode }) => {
  return {
    server: {
      // Localhost only — do not expose the API proxy / key material to the LAN
      port: 3000,
      host: '127.0.0.1',
      strictPort: false,
    },
    preview: {
      port: 3000,
      host: '127.0.0.1',
    },
    plugins: [react(), guardianProxyPlugin(mode)],
    // Intentionally NO define/injection of GEMINI_API_KEY into the client bundle.
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
