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

if (import.meta.env.DEV) {
  // Attempt to load why-did-you-render if available
  // This is optional and won't break if the package isn't installed
  try {
    // Dynamic import to avoid bundling in production
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const whyDidYouRender = require('why-did-you-render');
    if (whyDidYouRender?.default) {
      const React = require('react');
      whyDidYouRender.default(React, {
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
          // require('react-redux/lib').useSelector,
        ],
        logOwnerReasons: true,
        collapseGroups: true,
        groupByComponent: true,
      });
    }
  } catch {
    // why-did-you-render is optional - silently fail if not installed
    // Use React DevTools Profiler as alternative
  }
}

export default {};
