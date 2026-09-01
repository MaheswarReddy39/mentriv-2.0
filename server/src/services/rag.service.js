import { getEmbedding } from './embedding.service.js';
import { getCollection } from './vector-db.service.js';

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

  const collection = await getCollection();
  const queryEmbedding = await getEmbedding(query);

  const results = await collection.query({
    queryEmbeddings: [queryEmbedding],
    nResults: topK,
    include: ['documents', 'metadatas', 'distances'],
  });

  const ids = results.ids?.[0] || [];
  const documents = results.documents?.[0] || [];
  const metadatas = results.metadatas?.[0] || [];
  const distances = results.distances?.[0] || [];

  const chunks = [];

  for (let i = 0; i < ids.length; i++) {
    const distance = distances[i];
    const similarity = 1 - distance;

    if (similarity < minRelevance) {
      continue;
    }

    chunks.push({
      id: ids[i],
      text: documents[i],
      metadata: metadatas[i],
      distance,
      similarity,
    });
  }

  return {
    chunks,
    hasRelevantContext: chunks.length > 0,
  };
};

export {
  retrieveRelevantChunks,
  DEFAULT_TOP_K,
  DEFAULT_MIN_RELEVANCE,
};
