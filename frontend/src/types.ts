//=======================================================================================================
//=====================================URL MANIPULATION TYPES============================================
//=======================================================================================================

export interface SecureUrl {
    identifier: string;
    seed: string;
    fullUrl: string;
}

export interface CryptoSession {
    identifier: string;
    seed: string;
    derivedKey: CryptoKey;
}

//=======================================================================================================
//=====================================DATABASE TYPES====================================================
//=======================================================================================================

export interface Document {
    id: string;
    fileName: string;
    mime_type: string;
    content: Uint8Array;
    size: number;
    created_at : number;
    updated_at : number;
}

export interface SafeMetadata {
    id: string;
    size: number;
    version: number;
}
