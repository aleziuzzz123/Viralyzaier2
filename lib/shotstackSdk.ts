// src/lib/shotstackSdk.ts
declare global {
  interface Window {
    __SHOTSTACK_SDK__?: any;
    __SHOTSTACK_SDK_PROMISE__?: Promise<any>;
    __SHOTSTACK_BOOTED__?: boolean;
  }
}

/**
 * Load the vendored Shotstack Studio module exactly once.
 * Make sure the file exists at: public/vendor/shotstack-studio.mjs
 *   => it will be served at:   /vendor/shotstack-studio.mjs
 *
 * If you saved a versioned filename instead (e.g. shotstack-studio-1.6.2.mjs),
 * change SDK_PATH below to match it.
 */
const SDK_PATH = '/vendor/shotstack-studio.mjs';
// const SDK_PATH = '/vendor/shotstack-studio-1.6.2.mjs'; // <— use this if that's your file

export async function getShotstack() {
  if (window.__SHOTSTACK_SDK__) return window.__SHOTSTACK_SDK__;
  if (window.__SHOTSTACK_SDK_PROMISE__) return window.__SHOTSTACK_SDK_PROMISE__;

  const promise = import(/* @vite-ignore */ SDK_PATH).then((mod) => {
    window.__SHOTSTACK_SDK__ = mod;
    return mod;
  });

  window.__SHOTSTACK_SDK_PROMISE__ = promise;
  return promise;
}

/** Optional: allow a hard reset if needed on full unmount */
export function resetShotstackBootFlag() {
  window.__SHOTSTACK_BOOTED__ = false;
}
