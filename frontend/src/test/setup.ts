// src/test/setup.ts
import { vi, beforeAll, afterEach } from 'vitest'

// === WEB CRYPTO SETUP ===
beforeAll(async () => {
  // Assure-toi que Web Crypto est disponible
  if (!globalThis.crypto || !globalThis.crypto.subtle) {
    const { webcrypto } = await import('node:crypto')
    globalThis.crypto = webcrypto as any
  }
})

// === WINDOW MOCKS ===
Object.defineProperty(window, 'location', {
  value: {
    origin: 'https://localhost:3000',
    href: 'https://localhost:3000/',
    protocol: 'https:',
    host: 'localhost:3000',
    pathname: '/',
    search: '',
    hash: ''
  },
  writable: true
})

// === PERFORMANCE MOCK ===
if (!globalThis.performance) {
  globalThis.performance = {
    now: () => Date.now()
  } as any
}

// === SQL.JS MOCK (pour éviter le chargement WASM dans les tests) ===
vi.mock('sql.js', () => ({
  default: vi.fn(() => Promise.resolve({
    Database: vi.fn(() => ({
      exec: vi.fn(),
      export: vi.fn(() => new Uint8Array()),
      close: vi.fn()
    }))
  }))
}))

// === CLEANUP AFTER EACH TEST ===
afterEach(() => {
  // Nettoie les mocks si nécessaire
  vi.clearAllMocks()
})