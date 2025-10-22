import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(() => {
  return {
    server: {
      host: "::",
      port: 5173,
      strictPort: false, // Allow fallback to other ports if 5173 is in use
    },
    plugins: [
      react(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
