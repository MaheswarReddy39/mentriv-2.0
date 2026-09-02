#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { ingestAll, clearCollection } from '../src/services/ingestion.service.js';
import { initEmbeddingModel } from '../src/services/embedding.service.js';
import { initQdrant } from '../src/services/vector-db.service.js';

const args = process.argv.slice(2);
const clearFirst = args.includes('--clear');

const run = async () => {
  try {
    console.log('[runner] Initializing embedding model...');
    await initEmbeddingModel();
    console.log('[runner] Embedding model ready');

    console.log('[runner] Connecting to Qdrant...');
    await initQdrant();
    console.log('[runner] Qdrant connected');

    if (clearFirst) {
      console.log('[runner] Clearing existing collection...');
      await clearCollection();
    }

    console.log('[runner] Starting ingestion...');
    const result = await ingestAll();

    console.log('\n[runner] === INGESTION COMPLETE ===');
    console.log(`[runner] Files processed: ${result.filesProcessed}`);
    console.log(`[runner] Chunks created:   ${result.chunksCreated}`);
    console.log(`[runner] Total records:    ${result.totalRecords}`);

    process.exit(0);
  } catch (error) {
    console.error('[runner] Ingestion failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

run();
