import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Local development configuration with performance optimizations
export default defineConfig({
  plugins: [
    react({
      // Optimize React plugin for better performance
      fastRefresh: true,
      include: "**/*.{jsx,tsx}",
      exclude: /node_modules/,
    }),
  ],
  server: {
    port: 3000,
    host: '127.0.0.1', // localhost only
    // Optimize HMR for better performance
    hmr: {
      overlay: false, // Disable error overlay to reduce performance impact
      clientPort: 3000,
    },
    // Reduce file watching overhead
    watch: {
      usePolling: false,
      ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**', '**/coverage/**'],
      interval: 1000, // Increase interval to reduce CPU usage
    },
    // Optimize middleware
    middlewareMode: false,
    fs: {
      strict: false,
      allow: ['..']
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      },
      // Note: Admin API calls use absolute baseURL (http://127.0.0.1:5000) via axios, so no '/admin/*' proxies here
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable sourcemaps for simpler builds
    // Optimize build performance
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
        }
      }
    }
  },
  // Optimize development performance
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    exclude: ['@vite/client', '@vite/env'],
  },
  // Reduce memory usage
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  }
})