// Make all default Pixi v7 exports available
export * from "pixi.js";

// Explicit re-exports that Shotstack’s bundle expects to exist on "pixi.js"
export { Filter } from "@pixi/core";
export { Graphics } from "@pixi/graphics";
export { Color } from "@pixi/color";
export { deprecation } from "@pixi/utils";
export { Container } from "@pixi/display";

// --- Pixi v8-only names used by Shotstack’s bundle ---
// They do not exist in Pixi v7, so we provide harmless shims to satisfy Rollup.
export const GpuProgram: any = undefined;
export const GlProgram: any = undefined;
