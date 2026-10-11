import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import path from "node:path";

export default defineConfig({
  plugins: [svelte()],
  resolve: { alias: { "@": path.resolve(__dirname, "src"), $lib: path.resolve(__dirname, "src/lib") } },
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
