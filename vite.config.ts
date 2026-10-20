/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Caminho base da aplicação.
 *
 * O GitHub Pages publica "projetos" em https://<usuario>.github.io/<repositorio>/,
 * ou seja, em um subdiretório. Por isso o padrão abaixo usa o nome do repositório.
 *
 * Como adaptar ao nome real do repositório (qualquer uma das opções):
 *  1. Defina a variável de ambiente VITE_BASE (ex.: VITE_BASE=/meu-repo/ npm run build).
 *     O workflow .github/workflows/deploy.yml já faz isso automaticamente.
 *  2. Ou altere DEFAULT_BASE abaixo.
 *
 * Para um domínio próprio ou repositório "<usuario>.github.io", use VITE_BASE=/.
 */
export const DEFAULT_BASE = '/minha-lista-de-compras/';

function normalizeBase(value: string): string {
  let base = value.trim();
  if (!base.startsWith('/')) base = `/${base}`;
  if (!base.endsWith('/')) base = `${base}/`;
  return base;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = normalizeBase(process.env.VITE_BASE ?? env.VITE_BASE ?? DEFAULT_BASE);

  return {
    base,
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '1.0.0'),
    },
    plugins: [
      react(),
      VitePWA({
        // "prompt": a nova versão só é ativada quando a pessoa tocar em "Atualizar".
        registerType: 'prompt',
        injectRegister: false,
        includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
        manifestFilename: 'manifest.webmanifest',
        manifest: {
          id: base,
          name: 'Minha Lista de Compras',
          short_name: 'Minhas Compras',
          description:
            'Lista de compras simples, com entrada por digitação ou voz. Os dados ficam só no seu aparelho.',
          lang: 'pt-BR',
          dir: 'ltr',
          display: 'standalone',
          orientation: 'portrait',
          // Caminhos relativos ao manifesto: funcionam em qualquer subdiretório.
          start_url: base,
          scope: base,
          theme_color: '#1b8a4b',
          background_color: '#f4faf6',
          categories: ['shopping', 'productivity'],
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            {
              src: 'icons/maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
          // Fallback de navegação para o index.html dentro do subdiretório correto.
          navigateFallback: `${base}index.html`,
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          // skipWaiting só acontece quando a pessoa aceita a atualização.
          skipWaiting: false,
        },
        devOptions: { enabled: false },
      }),
    ],
    build: {
      target: 'es2020',
      sourcemap: false,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      restoreMocks: true,
    },
  };
});
