// Polyfill for process object in browser environment
// Define immediately to ensure it's available before any other code runs
(function () {
  globalThis.process ??= {
    env: {},
    version: '1.0.0',
    platform: 'browser' as NodeJS.Platform,
    browser: true,
    versions: {} as NodeJS.ProcessVersions,
    cwd: () => '/',
    nextTick: (fn: unknown) => {
      if (typeof fn !== 'function') {
        throw new TypeError('nextTick argument must be a function');
      }
      setTimeout(fn, 0);
    },
  } as unknown as NodeJS.Process;

  // Also define on window for compatibility
  if (globalThis.window !== undefined && globalThis.window.process === undefined) {
    globalThis.window.process = globalThis.process;
  }
})();
