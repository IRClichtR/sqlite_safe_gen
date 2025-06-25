import { describe, it, expect, beforeAll } from 'vitest'
import {
  bytesToBase64Url,
  base64UrlToBytes,
  generateSecureUrl,
  parseSecureUrl,
  deriveKey,
  encryptData,
  decryptData
} from '../core/crypto'

// Vérification que l'environnement est OK
beforeAll(() => {
  expect(crypto).toBeDefined() // Web Crypto doit être disponible
  expect(crypto.subtle).toBeDefined()
})

describe('Utilitaires Base64', () => {
  it('encode et decode correctement des bytes', () => {
    // ARRANGE : prépare les données
    const originalBytes = new Uint8Array([1, 2, 3, 4, 5])
    
    // ACT : exécute les fonctions
    const encoded = bytesToBase64Url(originalBytes)
    const decoded = base64UrlToBytes(encoded)
    
    // ASSERT : vérifie les résultats
    expect(encoded).toBeTypeOf('string')
    expect(decoded).toEqual(originalBytes)
    expect(encoded).not.toContain('=') // base64url n'a pas de padding
  })

  it('gère des données aléatoires', () => {
    const randomBytes = crypto.getRandomValues(new Uint8Array(16))
    const encoded = bytesToBase64Url(randomBytes)
    const decoded = base64UrlToBytes(encoded)
    
    expect(decoded).toEqual(randomBytes)
  })
})

describe('Génération et parsing d\'URLs', () => {
  it('génère des URLs valides', async () => {
    // ACT
    const secureUrl = await generateSecureUrl()
    
    // ASSERT
    expect(secureUrl.identifier).toBeTypeOf('string')
    expect(secureUrl.seed).toBeTypeOf('string')
    expect(secureUrl.fullUrl).toMatch(/\/safe\/.*\/.*/) // Format attendu
    
    // L'identifier fait environ 22 caractères (16 bytes en base64url)
    expect(secureUrl.identifier.length).toBeGreaterThan(20)
    // Le seed fait environ 43 caractères (32 bytes en base64url)
    expect(secureUrl.seed.length).toBeGreaterThan(40)
  })

  it('génère des URLs uniques', async () => {
    const url1 = await generateSecureUrl()
    const url2 = await generateSecureUrl()
    
    // Chaque URL doit être différente
    expect(url1.identifier).not.toBe(url2.identifier)
    expect(url1.seed).not.toBe(url2.seed)
  })

  it('parse correctement les URLs valides', async () => {
    // ARRANGE : génère une URL
    const original = await generateSecureUrl()
    
    // ACT : parse cette URL
    const parsed = parseSecureUrl(original.fullUrl)
    
    // ASSERT : doit retrouver les mêmes données
    expect(parsed).not.toBeNull()
    expect(parsed!.identifier).toBe(original.identifier)
    expect(parsed!.seed).toBe(original.seed)
  })

  it('rejette les URLs invalides', () => {
    const invalidUrls = [
      'https://example.com/safe/trop-court', // Il manque le seed
      'https://example.com/wrong/path',      // Mauvais path
      'pas-une-url',                         // Pas une URL du tout
    ]

    invalidUrls.forEach(badUrl => {
      expect(parseSecureUrl(badUrl)).toBeNull()
    })
  })
})

describe('Dérivation de clés', () => {
  it('dérive une clé utilisable', async () => {
    // ARRANGE
    const { seed, identifier } = await generateSecureUrl()
    
    // ACT
    const key = await deriveKey(seed, identifier)
    
    // ASSERT
    expect(key).toBeDefined()
    expect(key.type).toBe('secret')
    expect(key.algorithm.name).toBe('AES-GCM')
  })

  it('est déterministe (même entrée = même clé)', async () => {
    const { seed, identifier } = await generateSecureUrl()
    
    // Dérive 2 fois la même clé
    const key1 = await deriveKey(seed, identifier)
    const key2 = await deriveKey(seed, identifier)
    
    // On ne peut pas comparer les clés directement, mais on peut tester
    // qu'elles produisent le même chiffrement
    const testData = new Uint8Array([1, 2, 3])
    const encrypted1 = await encryptData(testData, key1)
    const encrypted2 = await encryptData(testData, key2)
    
    // Les deux clés doivent pouvoir déchiffrer les deux messages
    const decrypted1 = await decryptData(encrypted1, key2)
    const decrypted2 = await decryptData(encrypted2, key1)
    
    expect(decrypted1).toEqual(testData)
    expect(decrypted2).toEqual(testData)
  })
})

describe('Chiffrement et déchiffrement', () => {
  it('chiffre et déchiffre correctement', async () => {
    // ARRANGE : prépare clé et données
    const { seed, identifier } = await generateSecureUrl()
    const key = await deriveKey(seed, identifier)
    const originalData = new Uint8Array([10, 20, 30, 40, 50])
    
    // ACT : chiffre puis déchiffre
    const encrypted = await encryptData(originalData, key)
    const decrypted = await decryptData(encrypted, key)
    
    // ASSERT
    expect(decrypted).toEqual(originalData)
    expect(encrypted).not.toEqual(originalData) // Les données sont bien chiffrées
    expect(encrypted.length).toBeGreaterThan(originalData.length) // Nonce + tag ajoutés
  })

  it('produit un chiffrement différent à chaque fois', async () => {
    const { seed, identifier } = await generateSecureUrl()
    const key = await deriveKey(seed, identifier)
    const data = new Uint8Array([1, 2, 3])
    
    // Chiffre les mêmes données 2 fois
    const encrypted1 = await encryptData(data, key)
    const encrypted2 = await encryptData(data, key)
    
    // Le chiffrement doit être différent (à cause du nonce aléatoire)
    expect(encrypted1).not.toEqual(encrypted2)
    
    // Mais les deux doivent se déchiffrer correctement
    const decrypted1 = await decryptData(encrypted1, key)
    const decrypted2 = await decryptData(encrypted2, key)
    expect(decrypted1).toEqual(data)
    expect(decrypted2).toEqual(data)
  })

  it('échoue avec une mauvaise clé', async () => {
    // ARRANGE : 2 clés différentes
    const url1 = await generateSecureUrl()
    const url2 = await generateSecureUrl()
    const key1 = await deriveKey(url1.seed, url1.identifier)
    const key2 = await deriveKey(url2.seed, url2.identifier)
    
    const data = new Uint8Array([1, 2, 3])
    const encrypted = await encryptData(data, key1)
    
    // ACT & ASSERT : déchiffrer avec la mauvaise clé doit échouer
    await expect(decryptData(encrypted, key2)).rejects.toThrow()
  })
})

describe('Workflow complet', () => {
  it('exécute un cycle complet création -> chiffrement -> déchiffrement', async () => {
    // 1. Génère une URL sécurisée
    const url = await generateSecureUrl()
    console.log('✅ URL générée')
    
    // 2. Parse l'URL (comme si on la recevait)
    const parsed = parseSecureUrl(url.fullUrl)
    expect(parsed).not.toBeNull()
    console.log('✅ URL parsée')
    
    // 3. Dérive la clé cryptographique
    const key = await deriveKey(parsed!.seed, parsed!.identifier)
    console.log('✅ Clé dérivée')
    
    // 4. Chiffre des données sensibles
    const secretMessage = 'Mon message ultra secret!'
    const messageBytes = new TextEncoder().encode(secretMessage)
    const encrypted = await encryptData(messageBytes, key)
    console.log('✅ Données chiffrées')
    
    // 5. Déchiffre et vérifie
    const decrypted = await decryptData(encrypted, key)
    const decryptedMessage = new TextDecoder().decode(decrypted)
    console.log('✅ Données déchiffrées')
    
    // Vérification finale
    expect(decryptedMessage).toBe(secretMessage)
    console.log('🎉 Workflow complet réussi!')
  })
})