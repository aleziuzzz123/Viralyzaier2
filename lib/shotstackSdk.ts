// lib/shotstackSdk.ts
declare global {
  interface Window {
    __SHOTSTACK_SDK__?: any;
    __SHOTSTACK_SDK_PROMISE__?: Promise<any>;
  }
}

const SDK_URL = "/vendor/shotstack-studio.mjs";

export default async function getShotstackSDK(): Promise<any> {
  if (window.__SHOTSTACK_SDK__) return window.__SHOTSTACK_SDK__;
  if (window.__SHOTSTACK_SDK_PROMISE__) return window.__SHOTSTACK_SDK_PROMISE__;

  const p = import(/* @vite-ignore */ SDK_URL)
    .then((mod) => {
      window.__SHOTSTACK_SDK__ = mod;
      return mod;
    })
    .finally(() => {
      window.__SHOTSTACK_SDK_PROMISE__ = p;
    });

  window.__SHOTSTACK_SDK_PROMISE__ = p;
  return p;
}

// Optional reset (not used, but handy)
export function resetShotstackBootFlag() {
  delete window.__SHOTSTACK_SDK__;
  delete window.__SHOTSTACK_SDK_PROMISE__;
}
