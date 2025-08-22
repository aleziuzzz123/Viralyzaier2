declare global {
  interface Window {
    __SHOTSTACK_SDK__?: any;
    __SHOTSTACK_SDK_PROMISE__?: Promise<any>;
    __SHOTSTACK_BOOTED__?: boolean;
  }
}

/**
 * Load the vendored Shotstack Studio module exactly once.
 * File must exist at /public/vendor/shotstack-studio.mjs  ➜  /vendor/shotstack-studio.mjs
 */
export async function getShotstack() {
  if (window.__SHOTSTACK_SDK__) return window.__SHOTSTACK_SDK__;
  if (window.__SHOTSTACK_SDK_PROMISE__) return window.__SHOTSTACK_SDK_PROMISE__;

  const p = import(/* @vite-ignore */ '/vendor/shotstack-studio.mjs')
    .then((mod) => {
      window.__SHOTSTACK_SDK__ = mod;
      return mod;
    })
    .finally(() => {
      // Keep the promise for next importers
      window.__SHOTSTACK_SDK_PROMISE__ = p;
    });

  window.__SHOTSTACK_SDK_PROMISE__ = p;
  return p;
}

/** Optional: allow a hard reset if needed on full unmount */
export function resetShotstackBootFlag() {
  window.__SHOTSTACK_BOOTED__ = false;
}
