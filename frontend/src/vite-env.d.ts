// src/vite-env.d.ts
// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string
    readonly VITE_APP_NAME: string
    readonly VITE_CRYPTO_ITERATIONS: string
    readonly VITE_MAX_SAFE_SIZE: string
    // Vite injecte automatiquement ces variables
    readonly BASE_URL: string
    readonly MODE: string
    readonly DEV: boolean
    readonly PROD: boolean
    readonly SSR: boolean
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv
  }