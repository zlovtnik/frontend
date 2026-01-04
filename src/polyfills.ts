// Polyfill for process object in browser environment
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