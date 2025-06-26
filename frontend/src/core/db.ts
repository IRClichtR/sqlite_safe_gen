import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import{ Document } from '../types';

const MAX_SIZE_DOCUMENT = 1 * 1024 * 1024; // 2 MB, this is the maximum size of a individual document that can be stored in the database
const MAX_SIZE_SAFE = 10 * 1024 * 1024; // 10 MB, this is the maximum size of a database that can be safely loaded in memory 
const MAX_DOCUMENTS = 50; // 50 documents, this is the maximum number of documents that can be stored in the database
//=======================================================================================================

// Global variable for sql.js 
let SQL: SqlJsStatic | null = null;

// Init sql.js
export async function initDb(): Promise<void> {
    if (SQL) return; // Already initialized

    try {
        SQL = await initSqlJs({
            locateFile: (file: string) => `/sql-wasm/${file}`
        });
        console.log('SQL.js initialized successfully');
    } catch (error) {
        console.error('Error initializing SQL.js:', error);
        throw new Error('Failed to initialize SQL.js');
    }
}