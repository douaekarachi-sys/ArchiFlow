/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// Ce fichier de config tourne dans Node, hors du chargement automatique de .env de Vite
// (réservé à import.meta.env côté client) : on charge le .env racine nous-mêmes, comme le fait
// déjà le backend (main.ts).
const rootEnv = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

// En développement, /api est relayé vers le backend : l'application et l'API partagent la même
// origine, condition du cookie de session SameSite=Strict. Cible lue depuis API_PROXY_TARGET
// (.env.example) plutôt que codée en dur — le port par défaut du backend (3000) peut être pris
// par un autre service sur le poste de développement sans exiger de modifier ce fichier.
const apiProxyTarget = process.env['API_PROXY_TARGET'] ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: 5173,
    proxy: { '/api': { target: apiProxyTarget, changeOrigin: false } },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        // Dépendances tierces en chunks stables : elles restent en cache d'un déploiement à l'autre.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router'],
          data: ['@tanstack/react-query', 'zustand', 'zod', '@archiflow/shared'],
          i18n: ['i18next', 'react-i18next'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-label', '@radix-ui/react-slot'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    globals: true,
  },
});
