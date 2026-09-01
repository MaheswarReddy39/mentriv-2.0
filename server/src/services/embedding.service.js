import { AutoTokenizer, AutoModel } from '@xenova/transformers';
import env from '../config/env.js';

let tokenizer = null;
let model = null;

const MODEL_NAME = env.embeddingModel || 'BAAI/bge-small-en-v1.5';
const EMBEDDING_DIMENSION = 384;

const initEmbeddingModel = async () => {
  if (tokenizer && model) return { tokenizer, model };

  tokenizer = await AutoTokenizer.from_pretrained(MODEL_NAME);
  model = await AutoModel.from_pretrained(MODEL_NAME, { quantized: false });

  return { tokenizer, model };
};

const meanPooling = (lastHiddenState, attentionMask) => {
  const tokenEmbeddings = lastHiddenState;
  const maskExpanded = attentionMask.map((val) => val.map((v) => (v ? 1 : 0)));

  const sumEmbeddings = [];
  for (let i = 0; i < tokenEmbeddings.length; i++) {
    const sum = new Array(tokenEmbeddings[i][0].length).fill(0);
    for (let j = 0; j < tokenEmbeddings[i].length; j++) {
      if (maskExpanded[i][j] === 1) {
        for (let k = 0; k < sum.length; k++) {
          sum[k] += tokenEmbeddings[i][j][k];
        }
      }
    }
    const maskSum = maskExpanded[i].reduce((a, b) => a + b, 0);
    for (let k = 0; k < sum.length; k++) {
      sum[k] /= maskSum;
    }
    sumEmbeddings.push(sum);
  }
  return sumEmbeddings;
};

const normalize = (embeddings) => {
  return embeddings.map((emb) => {
    const norm = Math.sqrt(emb.reduce((sum, val) => sum + val * val, 0));
    return norm > 0 ? emb.map((val) => val / norm) : emb;
  });
};

const getEmbedding = async (text) => {
  if (!tokenizer || !model) {
    await initEmbeddingModel();
  }

  const inputs = await tokenizer(text, { padding: true, truncation: true });
  const output = await model(inputs);

  const attentionMask = Array.isArray(inputs.attention_mask)
    ? inputs.attention_mask
    : [Array.from(inputs.attention_mask.data)];

  const tokenEmbeddings = Array.from(output.last_hidden_state.data);
  const batchSize = output.last_hidden_state.dims[0];
  const seqLen = output.last_hidden_state.dims[1];
  const hiddenSize = output.last_hidden_state.dims[2];

  const reshaped = [];
  for (let i = 0; i < batchSize; i++) {
    const tokens = [];
    for (let j = 0; j < seqLen; j++) {
      tokens.push(tokenEmbeddings.slice(i * seqLen * hiddenSize + j * hiddenSize, i * seqLen * hiddenSize + (j + 1) * hiddenSize));
    }
    reshaped.push(tokens);
  }

  const pooled = meanPooling(reshaped, attentionMask);
  const normalized = normalize(pooled);

  return normalized[0];
};

const getEmbeddings = async (texts) => {
  if (!tokenizer || !model) {
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
