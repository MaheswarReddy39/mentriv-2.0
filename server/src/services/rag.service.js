import { getEmbedding } from './embedding.service.js';
import { getClient, COLLECTION_NAME } from './vector-db.service.js';
import ApiError from '../utils/api-error.js';

const DEFAULT_TOP_K = 5;
const DEFAULT_MIN_RELEVANCE = 0.5;

const retrieveRelevantChunks = async ({
  query,
  topK = DEFAULT_TOP_K,
  minRelevance = DEFAULT_MIN_RELEVANCE,
} = {}) => {
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return { chunks: [], hasRelevantContext: false };
  }

  try {
    const client = await getClient();
    const queryEmbedding = await getEmbedding(query);

    const response = await client.query(COLLECTION_NAME, {
      query: queryEmbedding,
      limit: topK,
      with_payload: true,
    });

    const results = response.points || [];

    const chunks = [];

    for (const result of results) {
      const similarity = result.score;

      if (similarity < minRelevance) {
        continue;
      }

      chunks.push({
        id: String(result.id),
        text: result.payload?.text || '',
        metadata: result.payload?.metadata || {},
        distance: 1 - similarity,
        similarity,
      });
    }

    return {
      chunks,
      hasRelevantContext: chunks.length > 0,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error(`[rag] retrieval failed: ${error.message}`);
    throw new ApiError(503, 'RAG service temporarily unavailable');
  }
};

export {
  retrieveRelevantChunks,
  DEFAULT_TOP_K,
  DEFAULT_MIN_RELEVANCE,
};
