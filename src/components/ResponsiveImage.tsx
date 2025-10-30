import React from 'react';
import { LazyImage } from './LazyImage';

const DEFAULT_WIDTHS = [320, 640, 768, 1024, 1280, 1536];

interface ResponsiveImageProps {
  src: string;
  alt: string;
  className?: string;
  widths?: number[];
  sizes?: string;
  format?: ('webp' | 'avif' | 'original')[] | 'webp' | 'avif' | 'original';
  fallback?: string;
  width?: number | string;
  height?: number | string;
  onLoad?: () => void;
  onError?: () => void;
}

export const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  src,
  alt,
  className,
  widths = DEFAULT_WIDTHS,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  format = 'webp',
  fallback,
  width,
  height,
  onLoad,
  onError,
}) => {
  const generateSrcSet = React.useCallback(
    (baseSrc: string, formatType: string) => {
      // Split baseSrc at the first '?' to separate pathname and query
      const [pathname = '', ...queryParts] = baseSrc.split('?');
      const queryString = queryParts.join('?'); // Rejoin in case there were multiple '?'

      // Compute modifiedPath once based on formatType
      const modifiedPath =
        formatType === 'original' ? pathname : `${pathname.replace(/\.[^/.]+$/, '')}.${formatType}`;

      return widths
        .map(w => {
          // Create fresh URLSearchParams per iteration to avoid shared mutable state
          const params = new URLSearchParams(queryString);
          // Set/overwrite the width parameter
          params.set('w', String(w));

          // Build URL with merged query string
          const formattedSrc = `${modifiedPath}?${params.toString()}`;
          return `${formattedSrc} ${w}w`;
        })
        .join(', ');
    },
    [widths]
  );

  // Normalize format to array for consistent handling
  const formatArray = React.useMemo(() => {
    if (Array.isArray(format)) {
      return format;
    }
    return [format];
  }, [format]);

  // Generate srcSets for each format in priority order
  const srcSets = React.useMemo(() => {
    const sets: { format: string; srcSet: string; type?: string }[] = [];

    formatArray.forEach(fmt => {
      if (fmt === 'original') {
        const baseForOriginal = fallback ?? src;
        sets.push({
          format: 'original',
          srcSet: generateSrcSet(baseForOriginal, 'original'),
        });
      } else if (fmt === 'webp') {
        sets.push({
          format: 'webp',
          srcSet: generateSrcSet(src, 'webp'),
          type: 'image/webp',
        });
      } else if (fmt === 'avif') {
        sets.push({
          format: 'avif',
          srcSet: generateSrcSet(src, 'avif'),
          type: 'image/avif',
        });
      }
    });

    return sets;
  }, [formatArray, generateSrcSet, fallback, src]);

  return (
    <picture>
      {srcSets.map((srcSetItem, idx) => {
        if (srcSetItem.format === 'original') {
          return (
            <source key={`${srcSetItem.format}-${idx}`} srcSet={srcSetItem.srcSet} sizes={sizes} />
          );
        }
        return (
          <source
            key={`${srcSetItem.format}-${idx}`}
            type={srcSetItem.type}
            srcSet={srcSetItem.srcSet}
            sizes={sizes}
          />
        );
      })}
      <LazyImage
        src={fallback || src}
        alt={alt}
        width={width}
        height={height}
        onLoad={onLoad}
        onError={onError}
        className={className}
      />
    </picture>
  );
};
