import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { chunkMarkdown } from './chunking.service.js';
import { getEmbedding, EMBEDDING_DIMENSION } from './embedding.service.js';
import { getCollection, COLLECTION_NAME } from './vector-db.service.js';

const KNOWLEDGE_DIR = path.resolve(process.cwd(), '..', 'Knowledge');

const discoverMarkdownFiles = async (dir) => {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await discoverMarkdownFiles(fullPath);
      files.push(...subFiles);
    } else if (entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
};

const deriveCategory = (filePath) => {
  const relative = path.relative(KNOWLEDGE_DIR, filePath);
  const parts = relative.split(path.sep);
  return parts.length > 1 ? parts[0] : 'general';
};

const generateChunkId = (relativePath, chunkIndex) => {
  const hash = crypto.createHash('sha256');
  hash.update(`${relativePath}::chunk::${chunkIndex}`);
  return hash.digest('hex');
};

const ingestDocument = async (filePath) => {
  const content = await fs.readFile(filePath, 'utf-8');
  const relativePath = path.relative(KNOWLEDGE_DIR, filePath);
  const category = deriveCategory(filePath);

  const chunks = chunkMarkdown(content);

  if (chunks.length === 0) {
    return { filePath: relativePath, chunks: 0, skipped: true };
  }

  const ids = [];
  const documents = [];
  const embeddings = [];
  const metadatas = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkId = generateChunkId(relativePath, i);

    const embedding = await getEmbedding(chunk.text);

    ids.push(chunkId);
    documents.push(chunk.text);
    embeddings.push(embedding);
    metadatas.push({
      source_file: relativePath,
      category,
      chunk_index: i,
      total_chunks: chunks.length,
      heading: chunk.heading || '',
      dimension: EMBEDDING_DIMENSION,
    });
  }

  return { filePath: relativePath, ids, documents, embeddings, metadatas, chunks: chunks.length };
};

const ingestAll = async () => {
  const collection = await getCollection();

  console.log(`[ingest] Discovering markdown files in ${KNOWLEDGE_DIR}...`);
  const files = await discoverMarkdownFiles(KNOWLEDGE_DIR);
  console.log(`[ingest] Found ${files.length} markdown files`);

  let totalChunks = 0;
  const results = [];

  for (const file of files) {
    console.log(`[ingest] Processing ${path.relative(KNOWLEDGE_DIR, file)}...`);
    const result = await ingestDocument(file);
    results.push(result);

    if (result.chunks > 0) {
      await collection.upsert({
        ids: result.ids,
        documents: result.documents,
        embeddings: result.embeddings,
        metadatas: result.metadatas,
      });
      totalChunks += result.chunks;
      console.log(`[ingest]   ${result.chunks} chunks indexed`);
    } else {
      console.log(`[ingest]   skipped (empty)`);
    }
  }

  const count = await collection.count();
  console.log(`[ingest] Done. ${results.length} files processed, ${totalChunks} chunks created, ${count} total records in collection`);

  return {
    filesProcessed: results.length,
    chunksCreated: totalChunks,
    totalRecords: count,
    details: results,
  };
};

const clearCollection = async () => {
  const collection = await getCollection();
  const count = await collection.count();
  if (count > 0) {
    await collection.delete({ where: {} });
    console.log(`[ingest] Cleared ${count} records from collection`);
  }
  return { cleared: count };
};

export { ingestAll, clearCollection, discoverMarkdownFiles, ingestDocument, KNOWLEDGE_DIR };
