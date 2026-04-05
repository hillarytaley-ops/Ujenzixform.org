import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "node:fs";
import { execSync } from "node:child_process";

/** Dev-only fallback when `.env` has no Supabase URL (matches previous embedded default). */
const LEGACY_DEV_SUPABASE_URL = "https://wuuyjjpgzgeimiptuuws.supabase.co";

/** Canonical site URL for og:image / og:url (Vercel preview vs production). */
function resolveSiteOrigin(): string {
  const explicit = process.env.VITE_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;
  return "https://ujenzixform.org";
}

/** Injected into client bundle for footer “Build:” line (compare to GitHub commit). */
function resolveAppBuildId(): string {
  const fromEnv =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.CF_PAGES_COMMIT_SHA ||
    process.env.GITHUB_SHA;
  if (fromEnv) return String(fromEnv).slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return "local";
  }
}

/**
 * Unique per Vercel deploy (changes even on rebuild of same commit). Falls back to git SHA.
 * Injected into index.html so build-cleanup.js can bust stale SW/cache when chunks change.
 */
function resolveAssetBuildId(): string {
  const deploy =
    process.env.VERCEL_DEPLOYMENT_ID?.trim() ||
    process.env.VERCEL_ID?.trim() ||
    process.env.CF_PAGES_DEPLOYMENT_ID?.trim();
  if (deploy) return deploy;
  const fullSha =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.CF_PAGES_COMMIT_SHA ||
    process.env.GITHUB_SHA;
  if (fullSha) return String(fullSha).slice(0, 12);
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim().slice(0, 12);
  } catch {
    return "local-" + Date.now();
  }
}

/**
 * Production-only: emits `/ga-bootstrap.js` (same-origin) so GA loads without inline script (stricter CSP).
 * When `VITE_GA_MEASUREMENT_ID` is unset, nothing is injected.
 */
function gaBootstrapPlugin(): Plugin {
  let outDir = "dist";
  let mode = "development";

  return {
    name: "ga-bootstrap",
    apply: "build",
    configResolved(config) {
      outDir = config.build.outDir;
      mode = config.mode;
    },
    transformIndexHtml(html) {
      if (mode !== "production") return html;
      const env = loadEnv(mode, process.cwd(), "");
      if (!env.VITE_GA_MEASUREMENT_ID?.trim()) return html;
      return html.replace(
        "</body>",
        '    <script defer src="/ga-bootstrap.js"></script>\n  </body>'
      );
    },
    closeBundle() {
      if (mode !== "production") return;
      const env = loadEnv(mode, process.cwd(), "");
      const gaId = env.VITE_GA_MEASUREMENT_ID?.trim();
      if (!gaId) return;
      const id = JSON.stringify(gaId);
      const source = `(function(){var id=${id};window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;var s=document.createElement("script");s.async=true;s.src="https://www.googletagmanager.com/gtag/js?id="+encodeURIComponent(id);s.onload=function(){gtag("js",new Date());gtag("config",id,{page_path:window.location.pathname,send_page_view:true});};document.head.appendChild(s);})();`;
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, "ga-bootstrap.js"), source, "utf8");
    },
  };
}

export default defineConfig(({ mode }) => {
  // Load env file based on mode (ensures .env.local is properly loaded)
  loadEnv(mode, process.cwd(), '');
  
  return {
    define: {
      __APP_BUILD_ID__: JSON.stringify(resolveAppBuildId()),
    },
    server: {
      host: "::",
      port: 5173,
      strictPort: false,
    },
    plugins: [
      react(),
      gaBootstrapPlugin(),
      {
        name: "inject-site-origin-meta",
        transformIndexHtml(html) {
          const origin = resolveSiteOrigin();
          const env = loadEnv(mode, process.cwd(), "");
          let supabaseUrl = env.VITE_SUPABASE_URL?.trim();
          if (!supabaseUrl && mode === "development") {
            supabaseUrl = LEGACY_DEV_SUPABASE_URL;
          }
          let supabaseOrigin = "";
          if (supabaseUrl) {
            try {
              supabaseOrigin = new URL(supabaseUrl).origin;
            } catch {
              supabaseOrigin = "";
            }
          }
          const assetBuildId =
            mode === "development" ? "dev" : resolveAssetBuildId();
          let out = html
            .replaceAll("%UJENZI_SITE_ORIGIN%", origin)
            .replaceAll("%UJENZI_ASSET_BUILD_ID%", assetBuildId);
          if (supabaseOrigin) {
            out = out.replaceAll("%UJENZI_SUPABASE_ORIGIN%", supabaseOrigin);
          } else {
            out = out.replace(
              /\s*<link rel="preconnect" href="%UJENZI_SUPABASE_ORIGIN%" crossorigin>\s*/i,
              "\n"
            );
          }
          return out;
        },
      },
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

