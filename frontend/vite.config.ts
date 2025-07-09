// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  
  optimizeDeps: {
    exclude: ['sql.js']
  },
  
  assetsInclude: ['**/*.wasm'],
  
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  
  server: {
    host: '0.0.0.0',
    middlewareMode: false,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  
  // ✅ Supprime CSP au niveau build aussi
  build: {
    rollupOptions: {
      output: {
        // Pas de CSP dans les assets
      }
    }
  }
})