# Asset Optimization Guide

This document outlines the asset optimization strategies implemented in this frontend project.

## Overview

The project includes comprehensive asset optimization to achieve Lighthouse performance scores > 90.

## Implemented Optimizations

### 1. Image Optimization

- **WebP Format**: Automatic conversion to WebP format with fallbacks
- **Lazy Loading**: Intersection Observer-based lazy loading for all images
- **Responsive Images**: Srcset generation for multiple screen sizes
- **Compression**: Optimized compression settings for different image formats

### 2. SVG Optimization

- **Metadata Removal**: Unnecessary attributes and metadata stripped
- **Sprite System**: SVG sprites for better caching and reduced HTTP requests
- **Inline Optimization**: Small SVGs inlined to reduce requests

### 3. Build Optimizations

- **Asset Inlining**: Assets < 4KB are inlined automatically
- **Code Splitting**: Intelligent chunk splitting for better caching
- **Tree Shaking**: Dead code elimination
- **Brotli Compression**: High-efficiency compression for production

### 4. Caching Strategies

- **Service Worker**: Aggressive caching for static assets (1 year)
- **Cache Headers**: Optimized cache headers for different asset types
- **Version Control**: Hash-based cache invalidation

## Components

### LazyImage Component

```tsx
import { LazyImage } from '@/components/LazyImage';

<LazyImage
  src="/path/to/image.jpg"
  alt="Description"
  width={300}
  height={200}
  onLoad={() => console.log('Image loaded')}
/>
```

### ResponsiveImage Component

```tsx
import { ResponsiveImage } from '@/components/ResponsiveImage';

<ResponsiveImage
  src="/path/to/image.jpg"
  alt="Description"
  widths={[320, 640, 768, 1024]}
  format="webp"
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

### IconSprite Component

```tsx
import { IconSprite } from '@/components/IconSprite';

<IconSprite name="heart" width={24} height={24} />
```

## Build Commands

### Standard Build
```bash
bun run build
```

### Build with Analysis
```bash
bun run build:analyze
```

The analysis command provides:
- Total bundle size
- Individual asset sizes
- Performance warnings
- Threshold compliance checks

## Performance Thresholds

- **Total Bundle Size**: < 1MB
- **Individual Assets**: < 512KB
- **Image Assets**: < 256KB
- **Lighthouse Score**: > 90

## Configuration Files

- `vite.config.ts`: Build optimization settings
- `src/config/cacheStrategies.ts`: Service worker caching rules
- `scripts/analyze-assets.js`: Performance analysis script

## Best Practices

1. **Use WebP format** for all photographic images
2. **Implement lazy loading** for below-the-fold images
3. **Use responsive images** with appropriate srcset
4. **Optimize SVGs** by removing unnecessary metadata
5. **Leverage caching** with appropriate cache headers
6. **Monitor bundle size** regularly with analysis script

## Monitoring Performance

Run the following to check performance after builds:

```bash
# Build with analysis
bun run build:analyze

# Check Lighthouse score (requires Chrome)
npx lighthouse http://localhost:3000 --output html --output-path ./lighthouse-report.html
```

## Troubleshooting

### Large Bundle Size
- Check the analysis report for large assets
- Ensure images are properly optimized
- Verify code splitting is working correctly

### Slow Image Loading
- Confirm lazy loading is implemented
- Check WebP conversion is working
- Verify responsive image srcset is appropriate

### Cache Issues
- Clear service worker cache in browser
- Verify cache headers are set correctly
- Check hash-based invalidation is working
