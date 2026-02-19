import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/graphql': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/graphiql': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  },
  build: {
    // ── Production Build Optimization ───────────────────────────────────
    // Interview: "How do you optimize frontend bundle size?"
    // → "Manual chunk splitting separates vendor libraries from app code.
    //    Vendors change rarely → long cache hits. App code changes often →
    //    only the small app chunk is re-downloaded on deploy."
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-ui': ['recharts', 'lucide-react'],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
        }
      }
    },
    // Warn if any chunk exceeds 500KB (default is 500)
    chunkSizeWarningLimit: 500,
    // Enable source maps for error tracking (Sentry)
    sourcemap: true,
  }
})
