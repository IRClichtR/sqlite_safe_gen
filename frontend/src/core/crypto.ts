import { SecureUrl } from '../types';

//=======================================================================================================
//=====================================URL MANIPULATION  UTILS===========================================
//=======================================================================================================

// Generate radom 16 byte array for identifier
function generateRandomBytes(length: number): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(length));
}
// Encode into base64
export function bytesToBase64Url(bytes: Uint8Array): string {
    const base64 = btoa(String.fromCharCode(...bytes));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); // Convert to base64url format
}

// Decode from base64
export function base64UrlToBytes(base64url: string): Uint8Array {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - base64.length % 4) % 4);
    const decoded = atob(base64 + padding);
    return new Uint8Array([...decoded].map(char => char.charCodeAt(0)));
}

// // Check URL format ok
// function isValidIdentifier(identifier: string): boolean {
//     // Check if identifier is a valid base64 string
//     const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
//     if (!base64Regex.test(identifier)) {
//         return false;
//     }
//     // Check length (should be 16 bytes when decoded)
//     const decodedLength = Buffer.from(identifier, 'base64').length;
//     return decodedLength === 16; // 16 bytes = 128 bits
// }


//=========================================================================================================
//=====================================CRYPTOGRAPHY UTILS==================================================
//=========================================================================================================

// Calculate salt = sha256 identifier

// Generate PBKDF2 100k iterations key from seed and salt


//=======================================================================================================
//=====================================URL MANIPULATION FUNCTIONS========================================
//=======================================================================================================

export async function generateSecureUrl(): Promise<SecureUrl> {
    const identifier = bytesToBase64Url(generateRandomBytes(16)); // 16 bytes for identifier
    const seed = bytesToBase64Url(generateRandomBytes(32)); // 32 bytes for seed
    const fullUrl = `${window.location.origin}/safe/${identifier}/${seed}`;
    
    return {
        identifier,
        seed,
        fullUrl
    };
}

export function parseSecureUrl(url: string): SecureUrl | null {
    try {
        const urlObj = new URL(url);

        const urlParts = urlObj.pathname.split('/');

        if (urlParts.length !== 4) return null;
        if (urlParts[1] !== 'safe') return null;

        const identifier = urlParts[2];
        const seed = urlParts[3];

        if (!identifier || !seed) return null;
        if (identifier.length < 20 || seed.length < 40) return null; // Base64 encoded 16 bytes

        return {
            identifier,
            seed,
            fullUrl: urlObj.href
        }
    } catch (error) {
        console.error('Error parsing secure URL:', error);
    }
    return null;
}

/** Decode seed from base64
* calculate salt = sha256 identifier
* implement PBKDF2 with 100k iterations
*/
export async function deriveKey(seed: string, identifier: string): Promise<CryptoKey> {
    const seedBytes = base64UrlToBytes(seed);
    const identifierBytes = base64UrlToBytes(identifier);
    const saltBuffer = await crypto.subtle.digest('SHA-256', identifierBytes.buffer as ArrayBuffer);

    const seedKey = await crypto.subtle.importKey(
        'raw',
        seedBytes.buffer as ArrayBuffer,
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );

    return await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: saltBuffer,
            iterations: 100000,
            hash: 'SHA-256'
        },
        seedKey,
        {
            name: 'AES-GCM',
            length: 256 // 256 bits
        },
        false,
        ['encrypt', 'decrypt']
    );
}


export async function encryptData(data: Uint8Array, key: CryptoKey): Promise<Uint8Array> {
    const nonce = crypto.getRandomValues(new Uint8Array(12));
     // 12 bytes for AES-GCM IV
    const encryptedBuffer = await crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv: nonce
        },
        key,
        new Uint8Array(data.buffer as ArrayBuffer)
    );

    const result = new Uint8Array(12 + encryptedBuffer.byteLength);
    result.set(nonce, 0); // Set the nonce at the beginning
    result.set(new Uint8Array(encryptedBuffer), 12); // Append the encrypted data after the nonce
    return result;
}


export async function decryptData(encryptedData: Uint8Array, key: CryptoKey): Promise<Uint8Array> {
    const nonce = encryptedData.slice(0, 12); // Extract the nonce from the first 12 bytes
    const ciphertext = encryptedData.slice(12); // The rest is the encrypted data

    const decryptedBuffer = await crypto.subtle.decrypt(
        {
            name: 'AES-GCM',
            iv: nonce
        },
        key,
        ciphertext
    );

    return new Uint8Array(decryptedBuffer as ArrayBuffer); // Convert to Uint8Array
}