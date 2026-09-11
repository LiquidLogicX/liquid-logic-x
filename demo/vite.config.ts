import { defineConfig } from "vite";

// Deployed under GitHub Pages (or any static host) at /demo/
export default defineConfig({
  base: "/demo/",
  server: {
    // FHE WASM can fall back to single-thread without COOP/COEP;
    // enable isolation when possible for SharedArrayBuffer.
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  optimizeDeps: {
    exclude: ["@zama-fhe/sdk"],
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
