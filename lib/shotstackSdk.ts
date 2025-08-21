// lib/shotstackSdk.ts
declare global {
  interface Window {
    __SHOTSTACK_SDK__?: any;
    __SHOTSTACK_SDK_PROMISE__?: Promise<any>;
  }
}

async function tryImport(path: string) {
  console.debug('[Shotstack loader] trying', path);
  // @vite-ignore so Vite doesn’t rewrite this path
  return import(/* @vite-ignore */ path);
}

async function loadLocal(): Promise<any> {
  const candidates = [
    '/vendor/shotstack-studio-1.6.1.js',
    '/vendor/shotstack-studio-1.6.1.mjs',
    '/vendor/shotstack-studio-1.6.1.esm.js',
    '/vendor/shotstack-studio.js',
    '/vendor/shotstack-studio.mjs',
  ];

  // fast HEAD probe to avoid throwing noisy import errors
  for (const url of candidates) {
    try {
      const r = await fetch(url, { method: 'HEAD', cache: 'no-store' });
      if (r.ok) return await tryImport(url);
    } catch { /* continue */ }
  }

  // fallback to direct attempts (covers servers that block HEAD)
  const errs: string[] = [];
  for (const url of candidates) {
    try { return await tryImport(url); }
    catch (e: any) { errs.push(`${url}: ${e?.message ?? e}`); }
  }

  throw new Error(
    'Local Shotstack SDK not found under /public/vendor.\n' +
    'Tried:\n' + errs.map(s => ' - ' + s).join('\n')
  );
}

export async function getShotstackSDK() {
  if (window.__SHOTSTACK_SDK__) return window.__SHOTSTACK_SDK__;
  if (window.__SHOTSTACK_SDK_PROMISE__) return window.__SHOTSTACK_SDK_PROMISE__;
  window.__SHOTSTACK_SDK_PROMISE__ = loadLocal().then(mod => {
    window.__SHOTSTACK_SDK__ = mod;
    return mod;
  });
  return window.__SHOTSTACK_SDK_PROMISE__;
}