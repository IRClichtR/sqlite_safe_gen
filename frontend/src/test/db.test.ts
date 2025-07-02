// src/test/db.test.ts
import { describe, it, expect, beforeAll, afterEach, beforeEach } from 'vitest';
import { Database } from 'sql.js';
import {
    initDb,
    createEmptySafe,
    loadSafeFromBytes,
    exportSafeToBytes,
    addDocument,
    listAllDocuments,
    getDocument,
    deleteDocument,
    getSafeMetadata,
    isSafeSizeWithinLimits,
    isDocumentCountWithinLimits,
    isDocumentValid,
    closeSafe
} from '../core/db';
import { Document, DocumentInput, SafeMetadata } from '../types';

describe('Database Operations', () => {
    let testSafe: Database;

    // Initialise sql.js avant tous les tests
    beforeAll(async () => {
        await initDb();
        console.log('✅ sql.js initialized for tests');
    });

    // Nettoie après chaque test
    afterEach(() => {
        if (testSafe) {
            try {
                closeSafe(testSafe);
            } catch (error) {
                // Ignore les erreurs de fermeture
            }
        }
    });

    describe('Safe Creation and Management', () => {
        it('should create an empty safe with metadata', async () => {
            const safeName = 'Test Safe';
            const safeDescription = 'A test safe for unit testing';

            testSafe = await createEmptySafe(safeName, safeDescription);

            expect(testSafe).toBeDefined();

            // Vérifie les métadonnées
            const metadata = await getSafeMetadata(testSafe);
            expect(metadata.name).toBe(safeName);
            expect(metadata.description).toBe(safeDescription);
            expect(metadata.document_count).toBe(0);
            expect(metadata.total_size).toBe(0);
            expect(metadata.created_at).toBeGreaterThan(0);
        });

        it('should export and reload a safe', async () => {
            // Crée un safe avec des données
            testSafe = await createEmptySafe('Export Test');
            
            const testDoc: DocumentInput = {
                fileName: 'test.txt',
                mime_type: 'text/plain',
                content: new TextEncoder().encode('Hello, World!')
            };

            await addDocument(testSafe, testDoc);

            // Export en bytes
            const exportedBytes = exportSafeToBytes(testSafe);
            expect(exportedBytes).toBeInstanceOf(Uint8Array);
            expect(exportedBytes.length).toBeGreaterThan(0);

            // Ferme le safe original
            closeSafe(testSafe);

            // Recharge depuis les bytes
            testSafe = await loadSafeFromBytes(exportedBytes);
            
            // Vérifie que les données sont intactes
            const documents = await listAllDocuments(testSafe);
            expect(documents).toHaveLength(1);
            expect(documents[0].fileName).toBe('test.txt');

            const metadata = await getSafeMetadata(testSafe);
            expect(metadata.name).toBe('Export Test');
            expect(metadata.document_count).toBe(1);
        });
    });

    describe('Document Operations', () => {
        beforeEach(async () => {
            testSafe = await createEmptySafe('Document Test Safe');
        });

        it('should add a document successfully', async () => {
            const docInput: DocumentInput = {
                fileName: 'sample.txt',
                mime_type: 'text/plain',
                content: new TextEncoder().encode('Sample content')
            };

            const addedDoc = await addDocument(testSafe, docInput);

            expect(addedDoc.id).toBeDefined();
            expect(addedDoc.fileName).toBe(docInput.fileName);
            expect(addedDoc.mime_type).toBe(docInput.mime_type);
            expect(addedDoc.size).toBe(docInput.content.length);
            expect(addedDoc.created_at).toBeGreaterThan(0);

            // Vérifie la mise à jour des métadonnées
            const metadata = await getSafeMetadata(testSafe);
            expect(metadata.document_count).toBe(1);
            expect(metadata.total_size).toBe(docInput.content.length);
        });

        it('should list all documents', async () => {
            // Ajoute plusieurs documents
            const docs: DocumentInput[] = [
                {
                    fileName: 'file1.txt',
                    mime_type: 'text/plain',
                    content: new TextEncoder().encode('Content 1')
                },
                {
                    fileName: 'file2.jpg',
                    mime_type: 'image/jpeg',
                    content: new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]) // Fake JPEG header
                }
            ];

            for (const doc of docs) {
                await addDocument(testSafe, doc);
            }

            const allDocs = await listAllDocuments(testSafe);
            expect(allDocs).toHaveLength(2);
            expect(allDocs.map(d => d.fileName)).toContain('file1.txt');
            expect(allDocs.map(d => d.fileName)).toContain('file2.jpg');
        });

        it('should get a specific document by ID', async () => {
            const docInput: DocumentInput = {
                fileName: 'specific.txt',
                mime_type: 'text/plain',
                content: new TextEncoder().encode('Specific content')
            };

            const addedDoc = await addDocument(testSafe, docInput);
            const retrievedDoc = await getDocument(testSafe, addedDoc.id);

            expect(retrievedDoc).toBeDefined();
            expect(retrievedDoc!.id).toBe(addedDoc.id);
            expect(retrievedDoc!.fileName).toBe(docInput.fileName);
            expect(new TextDecoder().decode(retrievedDoc!.content)).toBe('Specific content');
        });

        it('should return null for non-existent document', async () => {
            const nonExistentDoc = await getDocument(testSafe, 'non-existent-id');
            expect(nonExistentDoc).toBeNull();
        });

        it('should delete a document successfully', async () => {
            const docInput: DocumentInput = {
                fileName: 'to-delete.txt',
                mime_type: 'text/plain',
                content: new TextEncoder().encode('Will be deleted')
            };

            const addedDoc = await addDocument(testSafe, docInput);
            
            // Vérifie qu'il existe
            let doc = await getDocument(testSafe, addedDoc.id);
            expect(doc).toBeDefined();

            // Supprime
            await deleteDocument(testSafe, addedDoc.id);

            // Vérifie qu'il n'existe plus
            doc = await getDocument(testSafe, addedDoc.id);
            expect(doc).toBeNull();

            // Vérifie la mise à jour des métadonnées
            const metadata = await getSafeMetadata(testSafe);
            expect(metadata.document_count).toBe(0);
            expect(metadata.total_size).toBe(0);
        });
    });

    describe('Validation and Limits', () => {
        beforeEach(async () => {
            testSafe = await createEmptySafe('Validation Test Safe');
        });

        it('should validate document input correctly', () => {
            const validDoc: DocumentInput = {
                fileName: 'valid.txt',
                mime_type: 'text/plain',
                content: new TextEncoder().encode('Valid content')
            };

            const invalidDoc: DocumentInput = {
                fileName: '', // Nom vide
                mime_type: 'text/plain',
                content: new TextEncoder().encode('Content')
            };

            expect(isDocumentValid(validDoc)).toBe(true);
            expect(isDocumentValid(invalidDoc)).toBe(false);
        });

        it('should check safe size limits', async () => {
            expect(isSafeSizeWithinLimits(testSafe)).toBe(true);
            
            // Ajoute un petit document
            const smallDoc: DocumentInput = {
                fileName: 'small.txt',
                mime_type: 'text/plain',
                content: new TextEncoder().encode('Small content')
            };

            await addDocument(testSafe, smallDoc);
            expect(isSafeSizeWithinLimits(testSafe)).toBe(true);
        });

        it('should check document count limits', async () => {
            expect(isDocumentCountWithinLimits(testSafe)).toBe(true);

            // Ajoute quelques documents
            for (let i = 0; i < 5; i++) {
                const doc: DocumentInput = {
                    fileName: `doc${i}.txt`,
                    mime_type: 'text/plain',
                    content: new TextEncoder().encode(`Content ${i}`)
                };
                await addDocument(testSafe, doc);
            }

            expect(isDocumentCountWithinLimits(testSafe)).toBe(true);
        });

        it('should reject documents that are too large', async () => {
            // Crée un document de 2MB (dépasse la limite de 1MB)
            const largeContent = new Uint8Array(2 * 1024 * 1024);
            const largeDoc: DocumentInput = {
                fileName: 'large.bin',
                mime_type: 'application/octet-stream',
                content: largeContent
            };

            await expect(addDocument(testSafe, largeDoc)).rejects.toThrow();
        });
    });

    describe('Error Handling', () => {
        it('should handle loading invalid safe data', async () => {
            const invalidData = new Uint8Array([1, 2, 3, 4, 5]); // Données invalides

            await expect(loadSafeFromBytes(invalidData)).rejects.toThrow();
        });

        it('should handle deleting non-existent document', async () => {
            testSafe = await createEmptySafe('Error Test Safe');

            await expect(deleteDocument(testSafe, 'non-existent-id')).rejects.toThrow();
        });
    });

    describe('Safe Metadata', () => {
        it('should maintain accurate metadata', async () => {
            testSafe = await createEmptySafe('Metadata Test', 'Test description');

            // Métadonnées initiales
            let metadata = await getSafeMetadata(testSafe);
            expect(metadata.document_count).toBe(0);
            expect(metadata.total_size).toBe(0);

            // Ajoute des documents
            const doc1: DocumentInput = {
                fileName: 'doc1.txt',
                mime_type: 'text/plain',
                content: new TextEncoder().encode('First document')
            };

            const doc2: DocumentInput = {
                fileName: 'doc2.txt',
                mime_type: 'text/plain',
                content: new TextEncoder().encode('Second document')
            };

            const addedDoc1 = await addDocument(testSafe, doc1);
            const addedDoc2 = await addDocument(testSafe, doc2);

            // Vérifie les métadonnées après ajout
            metadata = await getSafeMetadata(testSafe);
            expect(metadata.document_count).toBe(2);
            expect(metadata.total_size).toBe(doc1.content.length + doc2.content.length);

            // Supprime un document
            await deleteDocument(testSafe, addedDoc1.id);

            // Vérifie les métadonnées après suppression
            metadata = await getSafeMetadata(testSafe);
            expect(metadata.document_count).toBe(1);
            expect(metadata.total_size).toBe(doc2.content.length);
        });
    });
});