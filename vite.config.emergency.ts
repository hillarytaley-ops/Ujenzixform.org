import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Emergency minimal configuration to get app running
export default defineConfig({
  server: {
    host: "localhost",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
