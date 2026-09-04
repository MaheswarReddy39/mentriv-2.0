import { GoogleGenAI } from '@google/genai';
import env from '../config/env.js';

let ai = null;
let initPromise = null;

const MODEL_NAME = env.geminiEmbeddingModel || 'gemini-embedding-001';
const EMBEDDING_DIMENSION = env.embeddingDimension || 768;
const DEFAULT_TASK_TYPE = 'RETRIEVAL_QUERY';
const DOCUMENT_TASK_TYPE = 'RETRIEVAL_DOCUMENT';

const initEmbeddingModel = async () => {
  if (ai) return { ai };
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      if (!env.geminiEmbeddingApiKey) {
        throw new Error('GEMINI_EMBEDDING_API_KEY is not configured');
      }

      ai = new GoogleGenAI({ apiKey: env.geminiEmbeddingApiKey });
      return { ai };
    } catch (error) {
      ai = null;
      initPromise = null;
      throw new Error(`Failed to initialize Gemini embedding client: ${error.message}`);
    }
  })();

  return initPromise;
};

const getEmbedding = async (text, { taskType = DEFAULT_TASK_TYPE } = {}) => {
  if (!text || typeof text !== 'string') {
    throw new Error('Text is required to generate an embedding');
  }

  if (!ai) {
    await initEmbeddingModel();
  }

  try {
    const response = await ai.models.embedContent({
      model: MODEL_NAME,
      contents: text,
      config: {
        taskType,
        outputDimensionality: EMBEDDING_DIMENSION,
      },
    });

    const values = response?.embeddings?.[0]?.values;
    const embedding = Array.isArray(values) ? values : [];

    if (embedding.length !== EMBEDDING_DIMENSION) {
      throw new Error(
        `Gemini embedding model "${MODEL_NAME}" returned ${embedding.length} dimensions; expected ${EMBEDDING_DIMENSION}`
      );
    }

    return embedding;
  } catch (error) {
    throw new Error(`Gemini embedding request failed: ${error.message}`);
  }
};

const getEmbeddings = async (texts, options = {}) => {
  if (!Array.isArray(texts)) {
    throw new Error('Texts must be an array');
  }

  if (!ai) {
    await initEmbeddingModel();
  }

  const embeddings = [];
  for (const text of texts) {
    const embedding = await getEmbedding(text, options);
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
  DEFAULT_TASK_TYPE,
  DOCUMENT_TASK_TYPE,
};
