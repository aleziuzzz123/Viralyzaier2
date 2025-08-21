// lib/shotstackSdk.ts
// Single-instance loader that does NOT use import.meta.env

declare global {
  interface Window {
    __SHOTSTACK_SDK__?: any;
    __SHOTSTACK_SDK_PROMISE__?: Promise<any>;
  }
}

function getBaseHref(): string {
  const el = document.querySelector('base[href]') as HTMLBaseElement | null;
  // default to root if no <base> is set
  const href = el?.getAttribute('href') || '/';
  return new URL(href, window.location.origin).toString();
}

function vendorUrl(file: string): string {
  // served from public/ at site root
  return new URL(`vendor/${file}`, getBaseHref()).toString();
}

const SDK_FILE = 'shotstack-studio-1.6.2.mjs';

export async function getShotstackSDK() {
  if (window.__SHOTSTACK_SDK__) return window.__SHOTSTACK_SDK__;
  if (window.__SHOTSTACK_SDK_PROMISE__) return window.__SHOTSTACK_SDK_PROMISE__;

  const url = vendorUrl(SDK_FILE);

  window.__SHOTSTACK_SDK_PROMISE__ = (async () => {
    // Helpful existence check for clearer errors
    const head = await fetch(url, { method: 'HEAD', cache: 'no-store' });
    if (!head.ok) {
      throw new Error(
        `Shotstack SDK not found. Expected at ${url}. ` +
        `Make sure the file exists at public/vendor/${SDK_FILE} and that <base href="/"> is set.`
      );
    }

    // @ts-ignore
    const mod = await import(/* @vite-ignore */ url);
    window.__SHOTSTACK_SDK__ = mod;
    return mod;
  })();

  return window.__SHOTSTACK_SDK_PROMISE__;
}