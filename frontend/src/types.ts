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