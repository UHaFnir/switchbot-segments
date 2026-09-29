import { defineConfig } from "vite";

// Ein einziges ES-Modul inkl. lit, direkt dorthin, wo die Integration es ausliefert
// (custom_components/switchbot_segments/panel.py). Generiert -- nie von Hand editieren.
export default defineConfig({
  build: {
    lib: {
      entry: "src/panel.ts",
      formats: ["es"],
      fileName: () => "panel.js",
    },
    outDir: "../custom_components/switchbot_segments/frontend",
    emptyOutDir: true,
    minify: "esbuild",
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
