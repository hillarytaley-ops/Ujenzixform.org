import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => {
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
    // Performance Optimizations
    build: {
      // Code splitting for better caching and faster loads
      rollupOptions: {
        output: {
          manualChunks: {
            // Separate vendor chunks for better caching
            'react-core': ['react', 'react-dom', 'react-router-dom'],
            'supabase': ['@supabase/supabase-js'],
            'icons': ['lucide-react'],
          },
        },
      },
      // Optimize chunk size
      chunkSizeWarningLimit: 1000,
      // Minify for production using esbuild (faster than terser)
      minify: 'esbuild',
      // Source maps only in dev
      sourcemap: mode === 'development',
      // Target modern browsers for smaller output
      target: 'es2020',
    },
    // Optimize dependencies pre-bundling
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@supabase/supabase-js',
        'lucide-react',
      ],
    },
  };
});
