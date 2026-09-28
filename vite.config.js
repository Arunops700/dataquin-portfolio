import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // The WebGL scene (three + React Three Fiber) is lazy-loaded from
    // Field.jsx and is expected to be a large chunk; the warning would
    // only ever fire for it.
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      output: {
        // Framework code changes far less often than site code — keep it
        // in its own file so returning visitors reuse the cached copy.
        // Matched by path so every entry of a package (react-dom/client
        // included) lands in the same chunk.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) return "react";
          if (/node_modules[\\/](framer-motion|motion-dom|motion-utils|lenis)[\\/]/.test(id)) return "motion";
          return undefined;
        },
      },
    },
  },
});
