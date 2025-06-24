import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],

  optimizeDeps: {
    exclude: ['sql.js'] // prevent sql.js from being bundled
  },

  assetsInclude: ['**/*.wasm'], // include .wasm files as assets

  worker: {
    format: 'es', // use ES module format for web workers
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'), // alias '@' to 'src' directory
    },
  },
})
