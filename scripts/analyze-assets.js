#!/usr/bin/env node

// Performance monitoring script for asset optimization
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const analyzeAssets = (distPath: string) => {
  const analysis = {
    totalSize: 0,
    assets: [] as Array<{
      name: string;
      size: number;
      type: string;
    }>,
  };

  const walkDir = (dir: string) => {
    const entries = readdirSync(dir);
    entries.forEach(entry => {
      const assetPath = join(dir, entry);
      const stats = statSync(assetPath);

      if (stats.isDirectory()) {
        walkDir(assetPath);
      } else if (stats.isFile()) {
        const size = stats.size;
        const type = entry.split('.').pop() || 'unknown';

        analysis.totalSize += size;
        analysis.assets.push({
          name: entry,
          size,
          type,
        });
      }
    });
  };

  walkDir(distPath);

  return analysis;
};

const checkPerformanceThresholds = (analysis: ReturnType<typeof analyzeAssets>) => {
  const thresholds = {
    maxTotalSize: 1024 * 1024, // 1MB
    maxAssetSize: 512 * 1024,  // 512KB
    maxImageSize: 256 * 1024,  // 256KB for images
  };

  const warnings: string[] = [];

  if (analysis.totalSize > thresholds.maxTotalSize) {
    warnings.push(`Total bundle size ${(analysis.totalSize / 1024 / 1024).toFixed(2)}MB exceeds threshold of ${(thresholds.maxTotalSize / 1024 / 1024).toFixed(2)}MB`);
  }

  analysis.assets.forEach(asset => {
    if (asset.size > thresholds.maxAssetSize) {
      warnings.push(`Asset ${asset.name} (${(asset.size / 1024).toFixed(2)}KB) exceeds threshold of ${(thresholds.maxAssetSize / 1024).toFixed(2)}KB`);
    }

    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(asset.type) && asset.size > thresholds.maxImageSize) {
      warnings.push(`Image ${asset.name} (${(asset.size / 1024).toFixed(2)}KB) exceeds image threshold of ${(thresholds.maxImageSize / 1024).toFixed(2)}KB`);
    }
  });

  return warnings;
};

// Run analysis if script is executed directly
if (import.meta.main) {
  const distPath = join(process.cwd(), 'dist');

  try {
    const analysis = analyzeAssets(distPath);
    const warnings = checkPerformanceThresholds(analysis);

    console.log('📊 Asset Analysis Report');
    console.log('========================');
    console.log(`Total bundle size: ${(analysis.totalSize / 1024).toFixed(2)}KB`);
    console.log(`Total assets: ${analysis.assets.length}`);
    console.log('');

    console.log('Asset breakdown:');
    analysis.assets
      .sort((a, b) => b.size - a.size)
      .forEach(asset => {
        console.log(`  ${asset.name}: ${(asset.size / 1024).toFixed(2)}KB (${asset.type})`);
      });

    if (warnings.length > 0) {
      console.log('');
      console.log('⚠️  Performance Warnings:');
      warnings.forEach(warning => console.log(`  - ${warning}`));
      process.exit(1);
    } else {
      console.log('');
      console.log('✅ All assets within performance thresholds');
    }
  } catch (error) {
    console.error('Error analyzing assets:', error);
    process.exit(1);
  }
}

export { analyzeAssets, checkPerformanceThresholds };
