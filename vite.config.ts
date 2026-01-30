import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// Lovable requires a Vite config to initialize and run its build/publish pipeline.
// This project uses Next.js for runtime, but providing this file unblocks Lovable tooling.
export default defineConfig(() => {
  return {
    plugins: [react()],
    server: {
      port: 8080,
    },
    resolve: {
      // Keep @ pointing to project root to match existing TS/Next aliases.
      alias: {
        "@": new URL("./", import.meta.url).pathname,
      },
    },
  };
});
