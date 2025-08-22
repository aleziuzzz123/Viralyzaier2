// lib/shotstackSdk.ts
declare global {
  interface Window {
    __SHOTSTACK_SDK__?: any;
    __SHOTSTACK_SDK_PROMISE__?: Promise<any>;
    __SHOTSTACK_BOOTED__?: boolean;
  }
}

/**
 * Load the vendored Shotstack Studio module exactly once.
 * File must exist at:  /public/vendor/shotstack-studio.mjs  -> served at /vendor/shotstack-studio.mjs
 */
export function getShotstack(): Promise<any> {
  if (window.__SHOTSTACK_SDK__) return Promise.resolve(window.__SHOTSTACK_SDK__);
  if (window.__SHOTSTACK_SDK_PROMISE__) return window.__SHOTSTACK_SDK_PROMISE__;

  const p = import(/* @vite-ignore */ '/vendor/shotstack-studio.mjs')
    .then((mod) => {
      window.__SHOTSTACK_SDK__ = mod;
      return mod;
    });

  window.__SHOTSTACK_SDK_PROMISE__ = p;
  return p;
}

// Backwards-compat: if something imports getShotstackSDK, this keeps working.
export const getShotstackSDK = getShotstack;

export function resetShotstackBootFlag() {
  window.__SHOTSTACK_BOOTED__ = false;
}
