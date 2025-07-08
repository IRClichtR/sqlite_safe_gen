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
    // updated_at : number;
}

export interface DocumentInput {
    fileName: string;
    mime_type: string;
    content: Uint8Array;
}

export interface SafeMetadata {
    name: string;
    description: string;
    created_at: number;
    total_size: number;
    document_count: number;
}

export interface SqlResult {
    columns: string[];
    values: unknown[][];
}

export class DbError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DbError';
    }
}

//=======================================================================================================
//==============================================API TYPES================================================
//=======================================================================================================

export interface CreateSafeResponse {
    id: string;
    created_at: string;
    metadata: {
        size: number;
        version: number;
    };
}