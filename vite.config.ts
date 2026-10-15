import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { loadLayeredEnv } from './server/env-file.ts';
import { guardianBubblePlugin } from './server/plugin.ts';

const localEnv = loadLayeredEnv(__dirname, process.env);
const host = process.env.HOST || localEnv.HOST || '127.0.0.1';

const documentHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(self), geolocation=()',
};

const sharedPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "media-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
];

export default defineConfig({
  envPrefix: 'VITE_',
  server: {
    port: 3000,
    host,
    headers: {
      ...documentHeaders,
      'Content-Security-Policy': [
        ...sharedPolicy,
        "script-src 'self' 'unsafe-inline'",
        "connect-src 'self' ws: wss:",
      ].join('; '),
    },
  },
  preview: {
    port: 3000,
    host,
    headers: {
      ...documentHeaders,
      'Content-Security-Policy': [
        ...sharedPolicy,
        "script-src 'self'",
        "connect-src 'self'",
      ].join('; '),
    },
  },
  plugins: [guardianBubblePlugin(), tailwindcss(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
