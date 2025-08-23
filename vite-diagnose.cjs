// vite-diagnose.cjs
function safeResolve(name) {
  try { return require.resolve(name); } catch { return null; }
}
function readVersion(pkg) {
  try { return require(pkg + '/package.json').version; } catch { return 'unknown'; }
}

const pixiMain = safeResolve('pixi.js');
const shotstackMain = safeResolve('@shotstack/shotstack-studio');

const pixiVersion = readVersion('pixi.js');
const shotstackVersion = readVersion('@shotstack/shotstack-studio');

console.log('[diagnose] pixi.js ->', pixiMain || '(not resolved)', 'version:', pixiVersion);
console.log('[diagnose] @shotstack/shotstack-studio ->', shotstackMain || '(not resolved)', 'version:', shotstackVersion);

if (!/^7\./.test(pixiVersion)) {
  console.error('[diagnose] ❌ Pixi MUST be 7.x for Shotstack 1.5.0. Found:', pixiVersion);
  process.exit(1);
}
console.log('[diagnose] ✅ Pixi 7.x confirmed');
