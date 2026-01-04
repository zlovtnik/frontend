// Polyfill for process object in browser environment
// Define immediately to ensure it's available before any other code runs
(function() {
  if (typeof globalThis.process === 'undefined') {
    globalThis.process = {
      env: {},
      version: '1.0.0',
      platform: 'browser',
      browser: true,
      versions: {},
      cwd: () => '/',
      nextTick: (fn) => setTimeout(fn, 0),
    };
  }

  // Also define on window for compatibility
  if (typeof window !== 'undefined' && typeof window.process === 'undefined') {
    window.process = globalThis.process;
  }
})();