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

/**
 * Type guard to safely check if an error has a specific error code property.
 * Handles various error object shapes from dynamic imports and module systems.
 *
 * @param err - Unknown error value to check
 * @param code - The error code to match (e.g., 'MODULE_NOT_FOUND')
 * @returns true if err is an object with a 'code' property matching the given code
 */
function hasErrorCode(err: unknown, code: string): boolean {
  return (
    err !== null &&
    typeof err === 'object' &&
    'code' in err &&
    (err as { code: unknown }).code === code
  );
}

if (import.meta.env.DEV) {
  // Attempt to load why-did-you-render if available
  // This is optional and won't break if the package isn't installed
  (async () => {
    try {
      // Dynamic import to avoid bundling in production
      const [whyDidYouRenderModule, React] = await Promise.all([
        import('why-did-you-render'),
        import('react'),
      ]);

      // Extract default export if present
      const whyDidYouRender = whyDidYouRenderModule?.default || whyDidYouRenderModule;
      const ReactModule = React?.default || React;

      if (whyDidYouRender && typeof whyDidYouRender === 'function') {
        whyDidYouRender(ReactModule, {
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
            // (await import('react-redux')).useSelector,
          ],
          logOwnerReasons: true,
          collapseGroups: true,
          groupByComponent: true,
        });
      }
    } catch (error) {
      // why-did-you-render is optional - silently fail if not installed
      // But log other errors to aid debugging
      if (error instanceof Error) {
        // Check for module not found errors (expected case)
        if (
          hasErrorCode(error, 'MODULE_NOT_FOUND') ||
          error.message.includes('Cannot find module')
        ) {
          // Expected error - why-did-you-render not installed, silently continue
          return;
        }
        // Log unexpected errors to help developers debug configuration issues
        console.warn('[whyDidYouRender] Failed to initialize:', error.message);
      } else {
        // Handle non-Error objects thrown
        console.warn('[whyDidYouRender] Failed to initialize with unexpected error:', error);
      }
    }
  })();
}

export default {};
