import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { loadEnvFile } from './server/env-file.ts';
import { guardianBubblePlugin } from './server/plugin.ts';

const localEnv = loadEnvFile(path.resolve(__dirname, '.env'));
const host = process.env.HOST || localEnv.HOST || '127.0.0.1';

export default defineConfig({
  envPrefix: 'VITE_',
  server: {
    port: 3000,
    host,
  },
  preview: {
    port: 3000,
    host,
  },
  plugins: [guardianBubblePlugin(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
