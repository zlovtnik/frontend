#!/usr/bin/env node

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Quick verification script for asset optimization
console.log('🔍 Verifying Asset Optimization Implementation...\n');

const checks = [
  {
    name: 'Vite Config - Asset Inline Limit',
    check: () => {
      const config = fs.readFileSync('./vite.config.ts', 'utf8');
      return config.includes('assetsInlineLimit: 4096');
    }
  },
  {
    name: 'Vite Config - Image Optimization Plugin',
    check: () => {
      const config = fs.readFileSync('./vite.config.ts', 'utf8');
      return config.includes('viteImagemin');
    }
  },
  {
    name: 'Vite Config - Brotli Compression',
    check: () => {
      const config = fs.readFileSync('./vite.config.ts', 'utf8');
      return config.includes('@rollup/plugin-brotli');
    }
  },
  {
    name: 'LazyImage Component',
    check: () => {
      return fs.existsSync('./src/components/LazyImage.tsx');
    }
  },
  {
    name: 'ResponsiveImage Component',
    check: () => {
      return fs.existsSync('./src/components/ResponsiveImage.tsx');
    }
  },
  {
    name: 'IconSprite Component',
    check: () => {
      return fs.existsSync('./src/components/IconSprite.tsx');
    }
  },
  {
    name: 'Cache Strategies Config',
    check: () => {
      return fs.existsSync('./src/config/cacheStrategies.ts');
    }
  },
  {
    name: 'Asset Analysis Script',
    check: () => {
      return fs.existsSync('./scripts/analyze-assets.js');
    }
  },
  {
    name: 'Build with Analysis Script',
    check: () => {
      const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
      return packageJson.scripts['build:analyze'] !== undefined;
    }
  },
  {
    name: 'SVG Optimization',
    check: () => {
      const svg = fs.readFileSync('./public/favicon.svg', 'utf8');
      return !svg.includes('font-family') && svg.includes('viewBox');
    }
  }
];

let passed = 0;
let failed = 0;

checks.forEach(({ name, check }) => {
  try {
    const result = check();
    if (result) {
      console.log(`✅ ${name}`);
      passed++;
    } else {
      console.log(`❌ ${name}`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ ${name} - Error: ${error instanceof Error ? error.message : String(error)}`);
    failed++;
  }
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('🎉 All asset optimization checks passed!');
  console.log('\nNext steps:');
  console.log('1. Run "bun install" to install new dependencies');
  console.log('2. Run "bun run build:analyze" to test the build with analysis');
  console.log('3. Check Lighthouse score for performance verification');
} else {
  console.log('⚠️  Some checks failed. Please review the implementation.');
  process.exit(1);
}
