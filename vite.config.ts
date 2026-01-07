import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => {
  // Load env file based on mode (ensures .env.local is properly loaded)
  loadEnv(mode, process.cwd(), '');
  
  return {
    server: {
      host: "::",
      port: 5173,
      strictPort: false,
    },
    plugins: [
      react(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      // CRITICAL: Dedupe React to prevent multiple instances
      dedupe: [
        'react',
        'react-dom',
        'react-router-dom',
        'react-router',
      ],
    },
    // Performance Optimizations for faster initial load
    build: {
      // Code splitting for better caching and faster loads
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Force all React-related code into a single chunk
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                return 'react-vendor';
              }
              if (id.includes('@supabase')) {
                return 'supabase';
              }
              if (id.includes('@radix-ui')) {
                return 'ui-vendor';
              }
              if (id.includes('lucide-react')) {
                return 'icons';
              }
            }
          },
          // Optimize chunk names for better caching
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
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
      // Enable CSS code splitting
      cssCodeSplit: true,
      // Optimize assets
      assetsInlineLimit: 4096,
    },
    // Optimize dependencies pre-bundling - CRITICAL for React singleton
    optimizeDeps: {
      // Include all React-related packages in the same optimization pass
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react-router-dom',
        'react-router',
        '@supabase/supabase-js',
        'lucide-react',
        '@radix-ui/react-dialog',
        '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-tooltip',
        '@radix-ui/react-slot',
        '@tanstack/react-query',
        'framer-motion',
        'sonner',
      ],
      // Use the main entry point to discover all dependencies
      entries: [
        'src/main.tsx',
      ],
    },
  };
});
