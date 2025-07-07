import { generateSecureUrl, parseSecureUrl, deriveKey, encryptData, decryptData } from './crypto';
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

        const secureUrl = await generateSecureUrl();

        const db = await createEmptySafe(name, description);

        const safeBytes = exportSafeToBytes(db);

        const key = await deriveKey(secureUrl.seed, secureUrl.identifier);
        const encryptedData = await encryptData(safeBytes, key);

        await uploadSafe(secureUrl.identifier, encryptedData);

        return secureUrl.fullUrl;
    }

    async openSafe(url: string): Promise<Uint8Array> {
        await this.init();

        const parsed = parseSecureUrl(url);

        if (!parsed) {
            throw new Error('Invalid secure URL format');
        }

        const encryptedData = await downloadSafe(parsed.identifier);
        const key = await deriveKey(parsed.seed, parsed.identifier);
        const safeBytes = await decryptData(encryptedData, key);

        const db = await loadSafeFromBytes(safeBytes);

        if (!db) {
            throw new Error('Failed to load safe from decrypted data');
        }
        return exportSafeToBytes(db);
    }
}