import { QdrantClient } from '@qdrant/js-client-rest';
import env from '../config/env.js';
import { EMBEDDING_DIMENSION } from './embedding.service.js';

const COLLECTION_NAME = env.qdrantCollection || 'mentriv_knowledge';

let client = null;
let initPromise = null;

const getCollectionVectorSize = (collectionInfo) => {
  const vectors = collectionInfo?.config?.params?.vectors;
  if (typeof vectors?.size === 'number') return vectors.size;
  const firstVectorConfig = vectors && typeof vectors === 'object'
    ? Object.values(vectors)[0]
    : null;
  return typeof firstVectorConfig?.size === 'number' ? firstVectorConfig.size : null;
};

const createCollection = async () => {
  await client.createCollection(COLLECTION_NAME, {
    vectors: {
      size: EMBEDDING_DIMENSION,
      distance: 'Cosine',
    },
  });
  console.log(`[qdrant] Created collection "${COLLECTION_NAME}" (${EMBEDDING_DIMENSION}d, cosine)`);
};

const initQdrant = async () => {
  if (client) return client;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const config = {
        url: env.qdrantUrl,
        checkCompatibility: false,
      };

      if (env.qdrantApiKey) {
        config.apiKey = env.qdrantApiKey;
      }

      client = new QdrantClient(config);

      const collections = await client.getCollections();
      const exists = collections.collections.some((c) => c.name === COLLECTION_NAME);

      if (!exists) {
        await createCollection();
      } else {
        const collectionInfo = await client.getCollection(COLLECTION_NAME);
        const vectorSize = getCollectionVectorSize(collectionInfo);

        if (vectorSize !== EMBEDDING_DIMENSION) {
          console.warn(`[qdrant] Recreating collection "${COLLECTION_NAME}" because vector size is ${vectorSize}, expected ${EMBEDDING_DIMENSION}`);
          await client.deleteCollection(COLLECTION_NAME);
          await createCollection();
        }
      }

      return client;
    } catch (error) {
      client = null;
      initPromise = null;
      throw error;
    }
  })();

  return initPromise;
};

const getClient = async () => {
  if (!client) {
    await initQdrant();
  }
  return client;
};

const getCollectionName = () => COLLECTION_NAME;

export {
  initQdrant,
  getClient,
  getCollectionName,
  COLLECTION_NAME,
  EMBEDDING_DIMENSION,
};
