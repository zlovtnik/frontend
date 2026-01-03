import React, { useState, useRef, useEffect } from 'react';
import { Skeleton } from 'antd';

// Singleton IntersectionObserver manager for efficient lazy loading
const createObserverManager = () => {
  let observer: IntersectionObserver | null = null;
  const callbacks = new Map<Element, () => void>();

  const getObserver = (): IntersectionObserver => {
    if (!observer) {
      observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const callback = callbacks.get(entry.target);
              if (callback) {
                callback();
                unobserve(entry.target);
              }
            }
          });
        },
        {
          threshold: 0.1,
          rootMargin: '50px',
        }
      );
    }
    return observer;
  };

  const observe = (element: Element, callback: () => void) => {
    callbacks.set(element, callback);
    getObserver().observe(element);
  };

  const unobserve = (element: Element) => {
    callbacks.delete(element);
    if (observer) {
      observer.unobserve(element);
    }
  };

  return { observe, unobserve };
};

const observerManager = createObserverManager();

// Transparent 1×1 GIF data URL for placeholder
const PLACEHOLDER_DATA_URL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className,
  width,
  height,
  placeholder,
  onLoad,
  onError,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observedElementRef = useRef<HTMLImageElement | null>(null);

  // Effect to observe/unobserve when the image element changes or error state changes
  useEffect(() => {
    const el = imgRef.current;

    // Unobserve the old element if it changed
    if (observedElementRef.current && observedElementRef.current !== el) {
      observerManager.unobserve(observedElementRef.current);
    }

    // Observe the new element if it exists and no error
    if (el && !hasError) {
      observerManager.observe(el, () => {
        setIsInView(true);
      });
      observedElementRef.current = el;
    } else {
      observedElementRef.current = null;
    }

    return () => {
      if (observedElementRef.current) {
        observerManager.unobserve(observedElementRef.current);
        observedElementRef.current = null;
      }
    };
  }, [hasError]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  // Only add 'relative' if no positioning class is present in className
  const hasPositioningClass = className && /\b(absolute|fixed|relative|sticky)\b/.test(className);
  const wrapperClassName = hasPositioningClass ? className : `relative ${className || ''}`.trim();

  return (
    <div className={wrapperClassName} style={{ width, height }}>
      {!isLoaded && !hasError && (
        <Skeleton.Image
          active
          className="absolute inset-0 w-full h-full"
          style={{ width, height }}
        />
      )}

      {!hasError && (
        <img
          ref={imgRef}
          src={isInView ? src : PLACEHOLDER_DATA_URL}
          alt={alt}
          className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          style={{ width, height }}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}

      {hasError && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-gray-200 text-gray-500"
          role="img"
          aria-label="Image failed to load"
        >
          {placeholder || <span className="text-sm">Image failed to load</span>}
        </div>
      )}
    </div>
  );
};
