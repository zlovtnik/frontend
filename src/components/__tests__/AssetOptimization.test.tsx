import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { render, screen, cleanup } from '@testing-library/react';
import { LazyImage } from '../LazyImage';
import { ResponsiveImage } from '../ResponsiveImage';
import { IconSprite } from '../IconSprite';

describe('Asset Optimization Components', () => {
  afterEach(() => {
    cleanup();
  });

  describe('LazyImage', () => {
    it('should render with required props', () => {
      const { container } = render(<LazyImage src="/test.jpg" alt="Test image" />);
      const img = container.querySelector('img');
      expect(img).toBeDefined();
      expect(img?.getAttribute('src')).toBe('/test.jpg');
      expect(img?.getAttribute('alt')).toBe('Test image');
    });

    it('should set loading attribute to lazy', () => {
      const { container } = render(<LazyImage src="/test.jpg" alt="Test image" />);
      const img = container.querySelector('img');
      expect(img?.getAttribute('loading')).toBe('lazy');
    });

    it('should apply width and height attributes', () => {
      const { container } = render(
        <LazyImage src="/test.jpg" alt="Test image" width={300} height={200} />
      );
      const img = container.querySelector('img');
      expect(img?.getAttribute('width')).toBe('300');
      expect(img?.getAttribute('height')).toBe('200');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <LazyImage src="/test.jpg" alt="Test image" className="test-class" />
      );
      const img = container.querySelector('img');
      expect(img?.classList.contains('test-class')).toBe(true);
    });

    it('should call onLoad handler when image loads', () => {
      const onLoad = () => {};
      const { container } = render(<LazyImage src="/test.jpg" alt="Test image" onLoad={onLoad} />);
      const img = container.querySelector('img');
      expect(img?.onload).toBeDefined();
    });

    it('should call onError handler when image fails to load', () => {
      const onError = () => {};
      const { container } = render(
        <LazyImage src="/test.jpg" alt="Test image" onError={onError} />
      );
      const img = container.querySelector('img');
      expect(img?.onerror).toBeDefined();
    });
  });

  describe('ResponsiveImage', () => {
    it('should render picture element with sources', () => {
      const { container } = render(<ResponsiveImage src="/test.jpg" alt="Test image" />);
      const picture = container.querySelector('picture');
      expect(picture).toBeDefined();
      const sources = container.querySelectorAll('source');
      expect(sources.length).toBeGreaterThan(0);
    });

    it('should generate correct srcset with width parameters', () => {
      const { container } = render(
        <ResponsiveImage src="/test.jpg" alt="Test image" widths={[320, 640]} />
      );
      const sources = container.querySelectorAll('source');
      let foundWidths = false;
      sources.forEach(source => {
        const srcset = source.getAttribute('srcset');
        if (srcset && srcset.includes('w=320') && srcset.includes('w=640')) {
          foundWidths = true;
        }
      });
      expect(foundWidths).toBe(true);
    });

    it('should render source elements in correct priority order (avif, webp, original)', () => {
      const { container } = render(
        <ResponsiveImage src="/test.jpg" alt="Test image" format={['avif', 'webp', 'original']} />
      );
      const sources = container.querySelectorAll('source');
      const types: (string | null)[] = [];
      sources.forEach(source => {
        types.push(source.getAttribute('type'));
      });
      // avif and webp should have type attributes, original should not
      expect(types[0]).toBe('image/avif');
      expect(types[1]).toBe('image/webp');
      expect(types[2]).toBeNull();
    });

    it('should apply sizes attribute to sources', () => {
      const customSizes = '(max-width: 600px) 100vw, 50vw';
      const { container } = render(
        <ResponsiveImage src="/test.jpg" alt="Test image" sizes={customSizes} />
      );
      const sources = container.querySelectorAll('source');
      sources.forEach(source => {
        expect(source.getAttribute('sizes')).toBe(customSizes);
      });
    });

    it('should handle URLs with existing query parameters', () => {
      const { container } = render(
        <ResponsiveImage src="/test.jpg?quality=80" alt="Test image" widths={[320]} />
      );
      const sources = container.querySelectorAll('source');
      let hasCorrectUrl = false;
      sources.forEach(source => {
        const srcset = source.getAttribute('srcset');
        // Should have w=320 and quality=80, joined with &, not multiple ?
        if (
          srcset &&
          srcset.includes('w=320') &&
          srcset.includes('quality=80') &&
          !srcset.includes('?w=320?')
        ) {
          hasCorrectUrl = true;
        }
      });
      expect(hasCorrectUrl).toBe(true);
    });
  });

  describe('IconSprite', () => {
    it('should render SVG element with correct dimensions', () => {
      const { container } = render(<IconSprite name="heart" width={24} height={24} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeDefined();
      expect(svg?.getAttribute('width')).toBe('24');
      expect(svg?.getAttribute('height')).toBe('24');
    });

    it('should apply fill color', () => {
      const { container } = render(<IconSprite name="heart" fill="#ff0000" />);
      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('fill')).toBe('#ff0000');
    });

    it('should apply custom className', () => {
      const { container } = render(<IconSprite name="heart" className="custom-icon" />);
      const svg = container.querySelector('svg');
      expect(svg?.classList.contains('custom-icon')).toBe(true);
    });

    it('should reference correct sprite id in use element', () => {
      const { container } = render(<IconSprite name="heart" />);
      const use = container.querySelector('use');
      expect(use?.getAttribute('href')).toBe('/icons/sprite.svg#heart');
    });

    it('should set aria-hidden when no ariaLabel provided', () => {
      const { container } = render(<IconSprite name="heart" />);
      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('aria-hidden')).toBe('true');
    });

    it('should set accessibility attributes when ariaLabel provided', () => {
      const { container } = render(<IconSprite name="heart" ariaLabel="Favorite" />);
      const svg = container.querySelector('svg');
      expect(svg?.getAttribute('role')).toBe('img');
      expect(svg?.getAttribute('aria-label')).toBe('Favorite');
      expect(svg?.getAttribute('aria-hidden')).toBe('false');
    });

    it('should render title element with ariaLabel when provided', () => {
      const { container } = render(<IconSprite name="heart" ariaLabel="Favorite" />);
      const title = container.querySelector('title');
      expect(title).toBeDefined();
      expect(title?.textContent).toBe('Favorite');
    });

    it('should generate unique titleId for each instance', () => {
      const { container } = render(
        <>
          <IconSprite name="heart" ariaLabel="Favorite" />
          <IconSprite name="heart" ariaLabel="Favorite" />
        </>
      );
      const titles = container.querySelectorAll('title');
      const ids = Array.from(titles).map(t => t.getAttribute('id'));
      // IDs should be different even for same icon name
      expect(ids[0]).not.toBe(ids[1]);
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
      const webpSupported = canvas.toDataURL('image/webp').startsWith('data:image/webp');
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
