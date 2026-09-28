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
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          motion: ["framer-motion", "lenis"],
        },
      },
    },
  },
});
