import { generateSecureUrl, generateRandomBytes, parseSecureUrl, deriveKey, encryptData, decryptData, bytesToBase64Url } from './crypto';
import { initDb, createEmptySafe, exportSafeToBytes, loadSafeFromBytes } from './db';
import { uploadSafe, downloadSafe } from './api';

export class SafeManager {
    private initialized = false;

    async init(): Promise<void> {
        if (!this.initialized) {
            await initDb();
            this.initialized = true;
        }
    }

    async createNewSafe(name: string, description: string): Promise<string> {
        await this.init();

        console.log('Creating new safe with name:', name, 'and description:', description);

        const identifier = crypto.randomUUID();
        console.log('Generated identifier:', identifier);

        const seed = bytesToBase64Url(generateRandomBytes(32));
        console.log('Generated seed:', seed);

        const db = await createEmptySafe(name, description);
        const safeBytes = exportSafeToBytes(db);
        console.log('Exported safe to bytes:', safeBytes);

        const key = await deriveKey(seed, identifier);
        console.log('Derived key for encryption:', key);
        const encryptedData = await encryptData(safeBytes, key);
        console.log('Encrypted safe data length:', encryptedData.length);

        await uploadSafe(identifier, encryptedData);

        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://localhost:5173';
        const fullUrl = `${origin}/safe/${identifier}/${seed}`;
        
        console.log('Generated secure URL:', fullUrl);
        return fullUrl;
    }

    async openSafe(url: string): Promise<Uint8Array> {
        await this.init();

        const parsed = parseSecureUrl(url);

        if (!parsed) {
            throw new Error('Invalid secure URL format');
        }

        console.log('Parsed secure URL:', parsed);
        console.log('Downloading safe with identifier:', parsed.identifier);
        console.log('Using seed for decryption:', parsed.seed);

        const encryptedData = await downloadSafe(parsed.identifier);
        console.log('Downloaded encrypted data length:', encryptedData.length);

        const key = await deriveKey(parsed.seed, parsed.identifier);
        console.log('Derived key for decryption:', key);

        const safeBytes = await decryptData(encryptedData, key);
        console.log('Decrypted safe bytes length:', safeBytes.length);

        const db = await loadSafeFromBytes(safeBytes);

        if (!db) {
            throw new Error('Failed to load safe from decrypted data');
        }
        return exportSafeToBytes(db);
    }
}