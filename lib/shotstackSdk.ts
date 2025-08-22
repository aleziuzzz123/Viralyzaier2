// lib/shotstackSdk.ts
// Single-instance loader that uses the official npm package.

declare global {
  interface Window {
    SHOTSTACK_SDK_PROMISE?: Promise<typeof import("@shotstack/shotstack-studio")>;
  }
}

export function getShotstackSDK() {
  if (!window.SHOTSTACK_SDK_PROMISE) {
    // Dynamically import the npm package and cache the promise
    // to ensure it's only fetched and evaluated once.
    window.SHOTSTACK_SDK_PROMISE = import("@shotstack/shotstack-studio");
  }
  return window.SHOTSTACK_SDK_PROMISE;
}
