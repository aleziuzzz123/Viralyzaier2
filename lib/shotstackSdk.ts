// lib/shotstackSdk.ts
declare global {
  interface Window {
    __SHOTSTACK_SDK__?: any;
    __SHOTSTACK_SDK_PROMISE__?: Promise<any>;
  }
}

/** Where the vendored ESM lives (must be /public/vendor/shotstack-studio.mjs) */
const SDK_URL = '/vendor/shotstack-studio.mjs';

/** Load the Shotstack Studio module exactly once (browser dynamic import). */
export async function getShotstackSdk(): Promise<any> {
  if (window.__SHOTSTACK_SDK__) return Promise.resolve(window.__SHOTSTACK_SDK__);
  if (window.__SHOTSTACK_SDK_PROMISE__) return window.__SHOTSTACK_SDK_PROMISE__;

  const p = import(/* @vite-ignore */ SDK_URL).then(mod => {
    window.__SHOTSTACK_SDK__ = mod;
    return mod;
  });

  window.__SHOTSTACK_SDK_PROMISE__ = p;
  return p;
}

/** Back-compat alias so other files can import getShotstackSDK */
export const getShotstackSDK = getShotstackSdk;

/** Optional helper if you ever want to force a fresh load */
export function resetShotstackBootFlag() {
  delete window.__SHOTSTACK_SDK__;
  delete window.__SHOTSTACK_SDK_PROMISE__;
}
