import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

// Adapter:
import adapter from "@sveltejs/adapter-vercel";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  extensions: [".svelte", ".svx"],
  preprocess: [vitePreprocess()],
  kit: {
    // Node runtime on Vercel (Fluid Compute). `vite preview` still serves the build locally.
    adapter: adapter({ runtime: "nodejs22.x" }),
    alias: {
      "@/*": "./src/*",
      "@/lib/*": "./src/lib/*",
    },
  },
};

export default config;
