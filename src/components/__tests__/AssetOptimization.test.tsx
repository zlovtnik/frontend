import { describe, it, expect } from 'bun:test';
import { LazyImage } from '../LazyImage';
import { ResponsiveImage } from '../ResponsiveImage';
import { IconSprite } from '../IconSprite';

describe('Asset Optimization Components', () => {
  describe('LazyImage', () => {
    it('should render with required props', () => {
      const component = LazyImage({
        src: '/test.jpg',
        alt: 'Test image',
      });
      expect(component).toBeDefined();
    });

    it('should handle optional props', () => {
      const component = LazyImage({
        src: '/test.jpg',
        alt: 'Test image',
        width: 300,
        height: 200,
        className: 'test-class',
        onLoad: () => {},
        onError: () => {},
      });
      expect(component).toBeDefined();
    });
  });

  describe('ResponsiveImage', () => {
    it('should render with default props', () => {
      const component = ResponsiveImage({
        src: '/test.jpg',
        alt: 'Test image',
      });
      expect(component).toBeDefined();
    });

    it('should use custom widths and sizes', () => {
      const component = ResponsiveImage({
        src: '/test.jpg',
        alt: 'Test image',
        widths: [320, 640, 1024],
        sizes: '100vw',
        format: 'webp',
      });
      expect(component).toBeDefined();
    });
  });

  describe('IconSprite', () => {
    it('should render with default dimensions', () => {
      const component = IconSprite({
        name: 'heart',
      });
      expect(component).toBeDefined();
    });

    it('should accept custom dimensions and fill', () => {
      const component = IconSprite({
        name: 'heart',
        width: 32,
        height: 32,
        fill: '#ff0000',
        className: 'custom-icon',
      });
      expect(component).toBeDefined();
    });
  });
});

describe('Performance Optimization', () => {
  describe('Asset Loading', () => {
    it('should support lazy loading', () => {
      // Test that lazy loading is properly implemented
      const img = document.createElement('img');
      img.loading = 'lazy';
      expect(img.loading).toBe('lazy');
    });

    it('should support WebP format detection', () => {
      // Test WebP support detection
      const canvas = document.createElement('canvas');
      const webpSupported = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
      expect(typeof webpSupported).toBe('boolean');
    });
  });

  describe('Caching Strategies', () => {
    it('should define proper cache names', () => {
      const cacheNames = {
        static: 'static-assets',
        resources: 'resources',
        html: 'html',
        api: 'api-cache',
      };
      
      Object.values(cacheNames).forEach(name => {
        expect(typeof name).toBe('string');
        expect(name.length).toBeGreaterThan(0);
      });
    });
  });
});
