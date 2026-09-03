import { pipeline } from '@xenova/transformers';
import env from '../config/env.js';

let extractor = null;
let initPromise = null;

const MODEL_NAME = env.embeddingModel || 'Xenova/all-MiniLM-L6-v2';
const EMBEDDING_DIMENSION = 384;

const initEmbeddingModel = async () => {
  if (extractor) return { extractor };
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      extractor = await pipeline('feature-extraction', MODEL_NAME, { quantized: true });
      return { extractor };
    } catch (error) {
      initPromise = null;
      throw new Error(`Failed to load local embedding model "${MODEL_NAME}": ${error.message}`);
    }
  })();

  return initPromise;
};

const getEmbedding = async (text) => {
  if (!text || typeof text !== 'string') {
    throw new Error('Text is required to generate an embedding');
  }

  if (!extractor) {
    await initEmbeddingModel();
  }

  const output = await extractor(text, {
    pooling: 'mean',
    normalize: true,
  });

  const embedding = Array.from(output.data);

  if (embedding.length !== EMBEDDING_DIMENSION) {
    throw new Error(
      `Local embedding model "${MODEL_NAME}" returned ${embedding.length} dimensions; expected ${EMBEDDING_DIMENSION}`
    );
  }

  return embedding;
};

const getEmbeddings = async (texts) => {
  if (!Array.isArray(texts)) {
    throw new Error('Texts must be an array');
  }

  if (!extractor) {
    await initEmbeddingModel();
  }

  const embeddings = [];
  for (const text of texts) {
    const embedding = await getEmbedding(text);
    embeddings.push(embedding);
  }
  return embeddings;
};

export {
  initEmbeddingModel,
  getEmbedding,
  getEmbeddings,
  EMBEDDING_DIMENSION,
  MODEL_NAME,
};
