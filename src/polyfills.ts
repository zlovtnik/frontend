// Polyfill for process object in browser environment
// Define immediately to ensure it's available before any other code runs
(function () {
  if (globalThis.process === undefined) {
    globalThis.process = {
      env: {},
      version: '1.0.0',
      platform: 'browser',
      browser: true,
      versions: {},
      cwd: () => '/',
      nextTick: (fn: unknown) => {
        if (typeof fn !== 'function') {
          throw new TypeError('nextTick argument must be a function');
        }
        setTimeout(fn, 0);
      },
    };
  }

  // Also define on window for compatibility
  if (globalThis.window !== undefined && globalThis.window.process === undefined) {
    globalThis.window.process = globalThis.process;
  }
})();
