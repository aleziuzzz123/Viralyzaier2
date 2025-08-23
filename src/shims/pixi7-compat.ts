// Re-export the aggregate API so generic imports from "pixi.js" still work
export * from "pixi.js";

// Explicitly re-export the symbols Shotstack expects to find on "pixi.js"
export { Filter, GpuProgram, GlProgram } from "@pixi/core";
export { Graphics } from "@pixi/graphics";
export { Color } from "@pixi/color";
export { deprecation } from "@pixi/utils";
