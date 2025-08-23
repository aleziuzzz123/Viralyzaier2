// The shotstack studio depends on Pixi.js v7, but can have issues with bundlers.
// This shim ensures all necessary components are explicitly exported.

// Re-export everything for general use
export * from "pixi.js";

// Explicitly re-export specific members that are known to cause issues with Rollup/Vite's tree-shaking
// when imported by @shotstack/shotstack-studio. This includes classes like Filter and Graphics.
// In Pixi v7, all of these are part of the main 'pixi.js' export.
export { Filter, Graphics, GpuProgram, GlProgram, Color, deprecation } from "pixi.js";
