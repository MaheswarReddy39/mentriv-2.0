import { ChromaClient } from 'chromadb';
import env from '../config/env.js';
import { EMBEDDING_DIMENSION } from './embedding.service.js';

const COLLECTION_NAME = 'mentriv_knowledge';

let client = null;
let collection = null;

const initChromaDb = async () => {
  if (client && collection) return { client, collection };

  const url = new URL(env.chromaDbUrl);
  client = new ChromaClient({
    host: url.hostname,
    port: Number(url.port) || 8000,
    ssl: url.protocol === 'https:',
  });

  collection = await client.getOrCreateCollection({
    name: COLLECTION_NAME,
    metadata: {
      'hnsw:space': 'cosine',
      description: 'Mentriv knowledge base documents',
    },
  });

  return { client, collection };
};

const getCollection = async () => {
  if (!collection) {
    await initChromaDb();
  }
  return collection;
};

const getClient = async () => {
  if (!client) {
    await initChromaDb();
  }
  return client;
};

export {
  initChromaDb,
  getCollection,
  getClient,
  COLLECTION_NAME,
  EMBEDDING_DIMENSION,
};
