import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Vite configuration with per-mode settings.
 *
 * Modes:
 *   development  →  vite dev          (default)
 *   staging      →  vite --mode staging / vite build --mode staging
 *   production   →  vite build        (default)
 */
export default defineConfig(({ mode }) => {
  const isProd    = mode === 'production'
  const isStaging = mode === 'staging'

  return {
    plugins: [
      react(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.js',
        manifest: false,
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        },
        devOptions: { enabled: false },
      }),
    ],

    // ── Build options ────────────────────────────────────────────────────────
    build: {
      // Source maps in dev/staging for easier debugging; disabled in prod for
      // smaller bundles (enable if using Sentry error tracking in prod).
      sourcemap: !isProd,

      // Always minify in staging & prod; skip in dev for faster rebuilds.
      minify: isProd || isStaging ? 'esbuild' : false,

      rollupOptions: {
        output: {
          // Split large vendor chunks to improve caching and initial load time.
          manualChunks: {
            // React + router
            'vendor-react':   ['react', 'react-dom', 'react-router-dom'],
            // Supabase client
            'vendor-supabase': ['@supabase/supabase-js'],
            // PDF renderer (large — loaded on demand but bundled separately)
            'vendor-pdf':     ['@react-pdf/renderer'],
            // Map library
            'vendor-leaflet': ['leaflet'],
            // Tabler icons
            'vendor-icons':   ['@tabler/icons-react'],
          },
        },
      },
    },

    // ── Dev server ────────────────────────────────────────────────────────────
    server: {
      port: 3000,
      // Prevent accidental exposure on the local network
      host: 'localhost',
    },

    // ── Preview server (for vite preview) ───────────────────────────────────
    preview: {
      port: 4173,
      host: 'localhost',
    },
  }
})
