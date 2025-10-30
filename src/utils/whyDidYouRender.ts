/**
 * Why Did You Render Setup (Optional)
 *
 * This module provides optional setup for why-did-you-render debugging.
 * It helps identify unnecessary re-renders and performance issues.
 *
 * Note: why-did-you-render is optional and not required for core functionality.
 *
 * To use:
 * 1. Install: npm install why-did-you-render
 * 2. Import in main.tsx: import('./utils/whyDidYouRender');
 *
 * Alternative: Use React DevTools Profiler for performance analysis
 */

import React from 'react';

if (import.meta.env.DEV) {
  // Attempt to load why-did-you-render if available
  // This is optional and won't break if the package isn't installed
  (async () => {
    try {
      // Dynamically import only why-did-you-render to avoid bundling in production
      // React is statically imported to ensure why-did-you-render patches the same instance
      const whyDidYouRenderModule = await import('why-did-you-render');

      // Extract default export if present
      const whyDidYouRender = whyDidYouRenderModule?.default || whyDidYouRenderModule;

      if (whyDidYouRender && typeof whyDidYouRender === 'function') {
        whyDidYouRender(React, {
          trackAllPureComponents: false,
          trackHooks: {
            useContext: true,
            useState: true,
            useReducer: true,
            useMemo: true,
            useCallback: true,
          },
          trackExtraHooks: [
            // Add custom hooks here if needed
            // Example (import at the top of the try block):
            // const ReactRedux = await import('react-redux');
            // Then add here: [ReactRedux.useSelector]
          ],
          logOwnerReasons: true,
          collapseGroups: true,
          groupByComponent: true,
        });
      }
    } catch (error) {
      // why-did-you-render is optional - silently fail if not installed
      // But log other errors to aid debugging
      const errorObj = error as Error & { code?: string };
      const errorMessage = errorObj?.message || String(error);

      // Check for module not found errors (expected case)
      // Only treat as expected if it's a MODULE_NOT_FOUND or "Cannot find module" error
      if (
        errorObj.code === 'MODULE_NOT_FOUND' ||
        errorMessage.includes('Cannot find module')
      ) {
        // Expected error - why-did-you-render not installed, silently continue
        return;
      }

      // Log unexpected errors to help developers debug configuration issues
      // This includes "Failed to fetch dynamically imported module" which may indicate other issues
      // eslint-disable-next-line no-console
      console.warn('[whyDidYouRender] Failed to initialize:', errorMessage);
    }
  })();
}

// Export empty object to allow consistent import syntax (import('./utils/whyDidYouRender'))
// This is a side-effect-only module; the export enables proper module resolution
export default {};
