import { defineConfig } from "vite";

// GitHub Pages serves the site from /FarmGO-Prototype/, so the
// production build needs that base path. During `npm run dev`
// the app is served from the root.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/FarmGO-Prototype/" : "/",
}));
