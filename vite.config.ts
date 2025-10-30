import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import viteImagemin from 'vite-plugin-imagemin';

// Import cache strategies
import { staticAssetCache, resourceCache, htmlCache } from './src/config/cacheStrategies';

const pwaOptions = {
  registerType: 'autoUpdate' as const,
  devOptions: {
    enabled: false,
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,woff,ttf,eot,otf}'],
    runtimeCaching: [
      staticAssetCache,
      resourceCache,
      htmlCache,
      {
        urlPattern: /^https:\/\/api\./,
        handler: 'NetworkFirst' as const,
        options: {
          cacheName: 'api-cache',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 86400,
          },
        },
      },
    ],
  },
};

export default defineConfig({
  plugins: [
    react(),
    VitePWA(pwaOptions),
    viteImagemin({
      mozjpeg: { quality: 80 },
      pngquant: { quality: [0.65, 0.8] },
      webp: { quality: 80 },
      svgo: {
        plugins: [
          { name: 'removeViewBox', active: false },
          { name: 'removeEmptyAttrs', active: false },
        ],
      },
    }),
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    })
  ],
  css: {
    postcss: './postcss.config.js',
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    sourcemap: 'hidden', // Generate sourcemaps but don't reference them in bundles
    assetsInlineLimit: 4096, // inline assets < 4kb
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name].[hash][extname]',
        manualChunks: (id) => {
          // React ecosystem
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-vendor';
          }

          // Ant Design - split into smaller chunks
          if (id.includes('antd')) {
            if (id.includes('@ant-design/icons')) {
              return 'antd-icons';
            }
            // Split antd components by category
            if (id.includes('es/form') || id.includes('es/input') || id.includes('es/button')) {
              return 'antd-forms';
            }
            if (id.includes('es/table') || id.includes('es/list') || id.includes('es/card')) {
              return 'antd-display';
            }
            return 'antd-core';
          }

          // Router
          if (id.includes('react-router')) {
            return 'router';
          }

          // Form libraries
          if (id.includes('react-hook-form') || id.includes('@hookform')) {
            return 'forms';
          }

          // Validation libraries
          if (id.includes('zod')) {
            return 'validation';
          }

          // Date utilities
          if (id.includes('dayjs')) {
            return 'date-utils';
          }

          // Functional programming
          if (id.includes('fp-ts') || id.includes('neverthrow') || id.includes('ts-pattern')) {
            return 'fp-utils';
          }

          // Utilities
          if (id.includes('lodash') || id.includes('qs')) {
            return 'utils';
          }

          // Node modules - catch remaining
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
    // Note: chunkSizeWarningLimit set to 1000 KB to accommodate large vendor bundles
    // (React, Ant Design, form libraries) that are difficult to split further without
    // impacting code organization. This is acceptable for this application as:
    // - Vendor chunks are cached aggressively by browsers
    // - The application targets modern browsers with good HTTP/2 support
    // - Dynamic imports are used for route-based code splitting
    // Future optimization: review manualChunks strategy if bundle size becomes critical
    chunkSizeWarningLimit: 1000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
