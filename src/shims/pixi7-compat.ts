// This file acts as a compatibility layer for PixiJS v7.
// The '@shotstack/shotstack-studio' package (v1.5.0) expects a 'deprecation' export from PixiJS,
// which was removed in version 7. This shim re-exports everything from the actual 'pixi.js'
// package and adds back a mock 'deprecation' function to prevent build failures.

// Re-export all named and default exports from the actual pixi.js package.
export * from 'pixi.js';

/**
 * A shim for the 'deprecation' function that was removed in PixiJS v7.
 * It logs a warning to the console, mimicking the original's behavior.
 * @param {string} version - The version where the feature was deprecated.
 * @param {string} message - The deprecation message.
 */
export const deprecation = (version: string, message: string): void => {
  if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn(`[Deprecation v${version}] ${message}`);
  }
};
