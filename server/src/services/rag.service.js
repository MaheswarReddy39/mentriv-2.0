import { getEmbedding } from './embedding.service.js';
import { getClient, COLLECTION_NAME } from './vector-db.service.js';
import ApiError from '../utils/api-error.js';

const DEFAULT_TOP_K = 5;
// Calibrated for Gemini embedding scores (gemini-embedding-001, 768-dim, cosine).
// Live score distribution on the production collection:
//   - All supported Mentriv queries (enrollment, support, pricing, schedules) score >= ~0.67
//     (lowest observed: "how i contact" = 0.6745, "How do I enroll?" = 0.6778).
//   - Unrelated negative queries (weather, cooking) top out at ~0.53.
// 0.6 retains every legitimately relevant chunk while excluding unrelated context.
// NOTE: do not blindly adjust without re-running scripts/test-rag-retrieval.js.
const DEFAULT_MIN_RELEVANCE = 0.6;

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
