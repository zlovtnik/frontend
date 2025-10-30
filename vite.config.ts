import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import viteImagemin from 'vite-plugin-imagemin';
import fs from 'fs';

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
    {
      name: 'ensure-dist-dir',
      apply: 'build',
      enforce: 'pre',
      async buildStart() {
        const distDir = path.resolve(__dirname, 'dist');
        if (!fs.existsSync(distDir)) {
          fs.mkdirSync(distDir, { recursive: true });
        }
      },
    },
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
      external: ['why-did-you-render'], // Exclude from production build
      output: {
        assetFileNames: 'assets/[name].[hash][extname]',
        manualChunks: (id) => {
          // React ecosystem
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-vendor';
          }

          // Ant Design - split into smaller chunks using robust regex patterns
          // Matches both 'es/' and 'lib/' module layouts for compatibility
          if (id.includes('antd')) {
            if (id.includes('@ant-design/icons')) {
              return 'antd-icons';
            }
            
            // Form-related components: form, input, button, checkbox, radio, select, etc.
            if (/(es|lib)\/(forms?|input|button|checkbox|radio|select|switch|slider|rate|time-picker|date-picker|cascader|tree-select)/i.test(id)) {
              return 'antd-forms';
            }
            
            // Display/data components: table, list, card, pagination, tree, etc.
            if (/(es|lib)\/(table|list|card|pagination|tree|timeline|steps|statistic|descriptions|empty|result|skeleton)/i.test(id)) {
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
