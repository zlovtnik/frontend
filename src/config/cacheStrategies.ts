// Static asset caching strategy
export const staticAssetCache = {
  urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf|eot|otf)$/,
  handler: 'CacheFirst' as const,
  options: {
    cacheName: 'static-assets',
    expiration: {
      maxEntries: 100,
      maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
    },
    cacheableResponse: {
      statuses: [0, 200],
    },
  },
};

// CSS and JS caching
export const resourceCache = {
  urlPattern: /\.(?:js|css)$/,
  handler: 'StaleWhileRevalidate' as const,
  options: {
    cacheName: 'resources',
    expiration: {
      maxEntries: 50,
      maxAgeSeconds: 24 * 60 * 60, // 24 hours
    },
  },
};

// HTML caching
export const htmlCache = {
  urlPattern: /\.html$/,
  handler: 'NetworkFirst' as const,
  options: {
    cacheName: 'html',
    expiration: {
      maxEntries: 10,
      maxAgeSeconds: 60 * 60, // 1 hour
    },
  },
};
