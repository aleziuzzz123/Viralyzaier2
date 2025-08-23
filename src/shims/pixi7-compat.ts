// Re-export everything from pixi.js…
export * from "pixi.js";
// …and also ensure `deprecation` is exported (Shotstack expects this)
export { deprecation } from "@pixi/utils";
