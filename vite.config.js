import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  build: {
    // Generate source maps for debugging (disable in prod if you prefer)
    sourcemap: false,

    // Increase chunk size warning limit (default 500 kB)
    chunkSizeWarningLimit: 600,

    rollupOptions: {
      output: {
        /**
         * Split large vendor deps into separate cacheable chunks.
         * Pages are already code-split via React.lazy().
         */
        manualChunks: {
          // React core – rarely changes, great cache candidate
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // Animation libraries
          "vendor-motion": ["framer-motion"],
          // Firebase SDK – large, split for better caching
          "vendor-firebase": [
            "firebase/app",
            "firebase/auth",
            "firebase/database",
            "firebase/functions",
            "firebase/storage",
          ],
          // State management
          "vendor-zustand": ["zustand"],
        },
      },
    },
  },
});
