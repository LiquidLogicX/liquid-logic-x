import { defineConfig } from "vite";

// GitHub project Pages site is served under /liquid-logic-x/
// so the demo lives at /liquid-logic-x/demo/
export default defineConfig({
  base: "/liquid-logic-x/demo/",
  server: {
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
