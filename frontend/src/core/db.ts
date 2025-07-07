import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { 
    Document, 
    DocumentInput, 
    SafeMetadata, 
    DbError 
} from '../types';

const MAX_SIZE_DOCUMENT = 1 * 1024 * 1024; // 2 MB, this is the maximum size of a individual document that can be stored in the database
const MAX_SIZE_SAFE = 10 * 1024 * 1024; // 10 MB, this is the maximum size of a database that can be safely loaded in memory 
const MAX_DOCUMENTS = 50; // 50 documents, this is the maximum number of documents that can be stored in the database
//=======================================================================================================

//=========================================================================================================
//=====================================Wasm path====================================================
//=========================================================================================================
// The path to the sql-wasm.wasm file, relative to the public directory
const WASM_PATH = '/public/sql-wasm/sql-wasm.wasm';
const WASM_PATH_JS = '/public/sql-wasm/sql-wasm.js';

// Global variable for sql.js 
let SQL: SqlJsStatic | null = null;
// Helper to get paths
function getWasmPath(): string {
    if (typeof process !== 'undefined' && process.env['NODE_ENV'] === 'test') {
        return ''
    }
    
    return WASM_PATH;
}
// Safe Schema
const SCHEMA_SQL = `
    CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        fileName TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        content BLOB NOT NULL,
        size INTEGER NOT NULL,
        created_at INTEGER NOT NULL
        );
        
    CREATE TABLE IF NOT EXISTS safe_metadata (
       name TEXT NOT NULL,
       description TEXT,
       created_at INTEGER NOT NULL,
       total_size INTEGER NOT NULL,
       document_count INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_filename ON documents(fileName);
    CREATE index IF NOT EXISTS idx_mime_type ON documents(mime_type);
`;

//=========================================================================================================`
//=====================================INITIALIZATION======================================================
//=========================================================================================================

// Init sql.js
export async function initDb(): Promise<void> {
    if (SQL) return; // Already initialized

    try {
        SQL = await initSqlJs({
            locateFile: (file: string) => `/public/sql-wasm/${file}`
        });
        console.log('SQL.js initialized successfully');
    } catch (error) {
        console.error('Error initializing SQL.js:', error);
        throw new Error('Failed to initialize SQL.js');
    }
}

//=========================================================================================================
// Safe Functions
//=========================================================================================================

export async function createEmptySafe(name: string, description = ''): Promise<Database> {
    if (!SQL) {
        throw new DbError('SQL.js is not initialized');
    }

    try {
        const safe = new SQL.Database();

        safe.exec(SCHEMA_SQL);

        const now = Date.now();
        const safeMetadata: SafeMetadata = {
            name,
            description,
            created_at: now,
            total_size: 0,
            document_count: 0
        };
        const insertMetadata = `
            INSERT INTO safe_metadata (name, description, created_at, total_size, document_count)
            VALUES (?, ?, ?, ?, ?);
        `;
        safe.run(insertMetadata, [
            safeMetadata.name,
            safeMetadata.description,
            safeMetadata.created_at,
            safeMetadata.total_size,
            safeMetadata.document_count
        ]);

        return safe;
    } catch(error) {
        console.error('Error creating empty safe:', error);
        throw new DbError('Failed to create empty safe');
    }
}

export async function loadSafeFromBytes(data: Uint8Array): Promise<Database> {
    if (!SQL) {
        throw new DbError('SQL.js is not initialized');
    }

    try {
        const safe = new SQL.Database(data);

        const tables = safe.exec("SELECT name FROM sqlite_master WHERE type='table';");
        const tableNames = tables[0]?.values.flat() || [];

        if (!tableNames.includes('documents') || !tableNames.includes('safe_metadata')) {
            throw new DbError('Invalid database schema');
        }
        console.log('Database schema is valid');

        return safe;
    } catch (error) {
        console.error('Error loading safe from bytes:', error);
        throw new DbError('Failed to load safe from bytes');
    }
}

export function exportSafeToBytes(safe: Database): Uint8Array {
    if (!SQL) {
        throw new DbError('SQL.js is not initialized');
    }

    try {
        const data = safe.export();
        console.log('Safe exported to bytes successfully: {} bytes', data.length);
        return new Uint8Array(data);
    } catch (error) {
        console.error('Error exporting safe to bytes:', error);
        throw new DbError('Failed to export safe to bytes');
    }
}

export async function addDocument(safe: Database, docInput: DocumentInput): Promise<Document> {
    if (!SQL) {
        throw new DbError('SQL.js is not initialized');
    }

    if (docInput.content.length > MAX_SIZE_DOCUMENT) {
        throw new DbError(`Document size exceeds maximum limit of ${MAX_SIZE_DOCUMENT} bytes`);
    }

    try {
        const now = Date.now();
        const doc: Document = {
            id: crypto.randomUUID(),
            fileName: docInput.fileName,
            mime_type: docInput.mime_type,
            content: docInput.content,
            size: docInput.content.length,
            created_at: now
        };

        const insertDoc = `
            INSERT INTO documents (id, fileName, mime_type, content, size, created_at)
            VALUES (?, ?, ?, ?, ?, ?);
        `;
        safe.run(insertDoc, [
            doc.id,
            doc.fileName,
            doc.mime_type,
            doc.content,
            doc.size,
            doc.created_at
        ]);

        // Update safe metadata
        const updateMetadata = `
            UPDATE safe_metadata
            SET total_size = total_size + ?, document_count = document_count + 1
        `;
        safe.run(updateMetadata, [doc.size]);

        return doc;
    } catch (error) {
        console.error('Error adding document:', error);
        throw new DbError('Failed to add document');
    }
}

export async function listAllDocuments(safe: Database): Promise<Document[]> {
    if (!SQL) {
        throw new DbError('SQL.js is not initialized');
    }

    try {
        const query = 'SELECT * FROM documents;';
        const result = safe.exec(query);

        if (result.length === 0) return [];

        const documents: Document[] = result[0].values.map(row => ({
            id: row[0] as string,
            fileName: row[1] as string,
            mime_type: row[2] as string,
            content: new Uint8Array(row[3] as Uint8Array),
            size: row[4] as number,
            created_at: row[5] as number
        }));

        return documents;
    } catch (error) {
        console.error('Error listing all documents:', error);
        throw new DbError('Failed to list all documents');
    }
}

export async function getDocument(safe: Database, documentId: string): Promise<Document | null> {
    if (!SQL) {
        throw new DbError('SQL.js is not initialized');
    }

    try {
        const query = 'SELECT * FROM documents WHERE id = ?;';
        const result = safe.exec(query, [documentId]);

        if (result.length === 0 || result[0].values.length === 0) {
            return null; // Document not found
        }

        const row = result[0].values[0];
        const document: Document = {
            id: row[0] as string,
            fileName: row[1] as string,
            mime_type: row[2] as string,
            content: new Uint8Array(row[3] as Uint8Array),
            size: row[4] as number,
            created_at: row[5] as number
        };

        return document;
    } catch (error) {
        console.error('Error getting document:', error);
        throw new DbError('Failed to get document');
    }
}

export async function deleteDocument(safe: Database, documentId: string): Promise<void> {
    if (!SQL) {
        throw new DbError('SQL.js is not initialized');
    }

    try {
        const doc = await getDocument(safe, documentId);
        if (!doc) {
            throw new DbError('Document not found');
        }

        const deleteDoc = 'DELETE FROM documents WHERE id = ?;';
        safe.run(deleteDoc, [documentId]);

        // Update safe metadata
        const updateMetadata = `
            UPDATE safe_metadata
            SET total_size = total_size - ?, document_count = document_count - 1
        `;
        safe.run(updateMetadata, [doc.size]);
    } catch (error) {
        console.error('Error deleting document:', error);
        throw new DbError('Failed to delete document');
    }
}

export async function getSafeMetadata(safe: Database): Promise<SafeMetadata> {
    if (!SQL) {
        throw new DbError('SQL.js is not initialized');
    }

    try {
        const query = 'SELECT * FROM safe_metadata;';
        const result = safe.exec(query);

        if (result.length === 0 || result[0].values.length === 0) {
            throw new DbError('Safe metadata not found');
        }

        const row = result[0].values[0];
        const metadata: SafeMetadata = {
            name: row[0] as string,
            description: row[1] as string,
            created_at: row[2] as number,
            total_size: row[3] as number,
            document_count: row[4] as number
        };

        return metadata;
    } catch (error) {
        console.error('Error getting safe metadata:', error);
        throw new DbError('Failed to get safe metadata');
    }
}

function getSafeSize(safe: Database): number {
    if (!SQL) {
        throw new DbError('SQL.js is not initialized');
    }

    try {
        const query = 'SELECT total_size FROM safe_metadata;';
        const result = safe.exec(query);

        if (result.length === 0 || result[0].values.length === 0) {
            return 0; // No metadata found
        }

        return result[0].values[0][0] as number;
    } catch (error) {
        console.error('Error getting safe size:', error);
        throw new DbError('Failed to get safe size');
    }
}

export function isSafeSizeWithinLimits(safe: Database): boolean {
    const size = getSafeSize(safe);
    return size <= MAX_SIZE_SAFE;
}

export function isDocumentCountWithinLimits(safe: Database): boolean {
    if (!SQL) {
        throw new DbError('SQL.js is not initialized');
    }

    try {
        const query = 'SELECT COUNT(*) FROM documents;';
        const result = safe.exec(query);

        if (result.length === 0 || result[0].values.length === 0) {
            return true; // No documents, within limits
        }

        const count = result[0].values[0][0] as number;
        return count <= MAX_DOCUMENTS;
    } catch (error) {
        console.error('Error checking document count:', error);
        throw new DbError('Failed to check document count');
    }
}

export function isDocumentSizeWithinLimits(document: Document): boolean {
    return document.size <= MAX_SIZE_DOCUMENT;
}

export function isDocumentValid(docInput: DocumentInput): boolean {
    return docInput.content.length <= MAX_SIZE_DOCUMENT && docInput.fileName.trim() !== '';
}

export function closeSafe(safe: Database): void {
    if (!SQL) {
        throw new DbError('SQL.js is not initialized');
    }

    try {
        safe.close();
        console.log('Safe closed successfully');
    } catch (error) {
        console.error('Error closing safe:', error);
        throw new DbError('Failed to close safe');
    }
}