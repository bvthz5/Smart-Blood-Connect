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
      '^/api/admin': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            if (req.method === 'OPTIONS') {
              proxyReq.setHeader('Access-Control-Allow-Origin', '*');
              proxyReq.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
              proxyReq.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
              proxyReq.setHeader('Access-Control-Max-Age', '3600');
            }
          });
          proxy.on('error', (err, req, res) => {
            console.warn('Proxy error:', err);
          });
        },
      },
      '^/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            if (req.method === 'OPTIONS') {
              proxyReq.setHeader('Access-Control-Allow-Origin', '*');
              proxyReq.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
              proxyReq.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
              proxyReq.setHeader('Access-Control-Max-Age', '3600');
            }
          });
          proxy.on('error', (err, req, res) => {
            console.warn('Proxy error:', err);
          });
        },
      }
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