import { CreateSafeResponse } from "@/types";

const API_BASE = 'http://localhost:8000'

export async function uploadSafe(identifier: string, data: Uint8Array): Promise<CreateSafeResponse> {
    try {
        const response = await fetch(`${API_BASE}/safes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: identifier,
                encrypted_blob: Array.from(data),
                metadata: {
                    size: data.length,
                    version: 1
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP $(response.status): ${errorText}`);
        }

        const result = await response.json();
        return result as CreateSafeResponse;
    } catch (error) {
        console.error('Error uploading safe:', error);
        throw error;
    }
}

export async function downloadSafe(identifier: string): Promise<Uint8Array> {
    try {
        console.log('Downloading safe with identifier:', identifier);

        const response = await fetch(`${API_BASE}/safes/${identifier}`);

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(`Safe with identifier ${identifier} not found`);
            }
            throw new Error(`Failed to download safe: ${response.statusText}`);
        }

        const data = await response.json();
        return new Uint8Array(data.encrypted_blob);
    } catch (error) {
        console.error('Error downloading safe:', error);
        throw error; // Re-throw the error for further handling if needed
    }
}