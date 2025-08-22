// src/lib/shotstackSdk.ts
declare global {
  interface Window {
    __SHOTSTACK_SDK__?: any;
    __SHOTSTACK_SDK_PROMISE__?: Promise<any>;
    __SHOTSTACK_BOOTED__?: boolean;
  }
}

const SDK_PATH = '/vendor/shotstack-studio.mjs'; // <-- matches your filename

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

export function resetShotstackBootFlag() {
  window.__SHOTSTACK_BOOTED__ = false;
}
