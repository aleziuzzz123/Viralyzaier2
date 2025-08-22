// lib/shotstackSdk.ts

declare global {
  interface Window {
    __SHOTSTACK_SDK__?: any;
    __SHOTSTACK_SDK_PROMISE__?: Promise<any>;
  }
}

/** The vendored ESM lives at /public/vendor/shotstack-studio.mjs */
const SDK_URL = '/vendor/shotstack-studio.mjs';

/** Load the Shotstack Studio module exactly once (dynamic browser import). */
export function getShotstackSdk(): Promise<any> {
  if (window.__SHOTSTACK_SDK__) return Promise.resolve(window.__SHOTSTACK_SDK__);
  if (window.__SHOTSTACK_SDK_PROMISE__) return window.__SHOTSTACK_SDK_PROMISE__;

  const p = import(/* @vite-ignore */ SDK_URL).then((mod) => {
    window.__SHOTSTACK_SDK__ = mod;
    return mod;
  });

  window.__SHOTSTACK_SDK_PROMISE__ = p;
  return p;
}

/** Back-compat aliases so any import name works */
export const getShotstackSDK = getShotstackSdk;
export const getShotstack    = getShotstackSdk;

/** Optional: force a fresh load (rarely needed) */
export function resetShotstackBootFlag() {
  delete window.__SHOTSTACK_SDK__;
  delete window.__SHOTSTACK_SDK_PROMISE__;
}
