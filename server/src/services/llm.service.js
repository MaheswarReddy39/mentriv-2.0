import env from '../config/env.js';
import ApiError from '../utils/api-error.js';

const PROVIDER_TIMEOUT_MS = 30000;

const buildMessages = ({ systemInstructions, question, context }) => {
  const messages = [];

  if (systemInstructions) {
    messages.push({ role: 'system', content: systemInstructions });
  }

  if (context && Array.isArray(context) && context.length > 0) {
    const contextBlock = context
      .map((chunk, i) => `[${i + 1}] ${chunk.text}`)
      .join('\n\n');

    messages.push({
      role: 'system',
      content: `Use the following context to answer the question. If the context does not contain enough information, say so clearly.\n\nContext:\n${contextBlock}`,
    });
  }

  messages.push({ role: 'user', content: question });
  return messages;
};

const callOpenAICompatible = async ({ url, apiKey, model, messages, extraHeaders = {} }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...extraHeaders,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response');
    }

    return content.trim();
  } finally {
    clearTimeout(timeout);
  }
};

const callGemini = async ({ apiKey, model, messages }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

  try {
    let systemInstruction = '';
    const contents = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemInstruction = systemInstruction
          ? `${systemInstruction}\n\n${msg.content}`
          : msg.content;
      } else {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const body = { contents };
    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      throw new Error('Empty response');
    }

    return content.trim();
  } finally {
    clearTimeout(timeout);
  }
};

const providers = [
  {
    name: 'openrouter',
    isAvailable: () => Boolean(env.openrouterApiKey),
    call: async (messages) =>
      callOpenAICompatible({
        url: 'https://openrouter.ai/api/v1/chat/completions',
        apiKey: env.openrouterApiKey,
        model: env.llmModel,
        messages,
        extraHeaders: {
          'HTTP-Referer': env.appFrontendUrl || 'http://localhost:5173',
          'X-Title': 'Mentriv AI Chatbot',
        },
      }),
  },
  {
    name: 'groq',
    isAvailable: () => Boolean(env.groqApiKey),
    call: async (messages) =>
      callOpenAICompatible({
        url: 'https://api.groq.com/openai/v1/chat/completions',
        apiKey: env.groqApiKey,
        model: env.groqModel,
        messages,
      }),
  },
  {
    name: 'gemini',
    isAvailable: () => Boolean(env.geminiApiKey),
    call: async (messages) =>
      callGemini({
        apiKey: env.geminiApiKey,
        model: env.geminiModel,
        messages,
      }),
  },
];

const generateAnswer = async ({
  systemInstructions,
  question,
  context = null,
} = {}) => {
  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    throw new ApiError(400, 'Question is required');
  }

  const messages = buildMessages({ systemInstructions, question, context });

  const availableProviders = providers.filter((p) => p.isAvailable());

  if (availableProviders.length === 0) {
    throw new ApiError(500, 'No LLM providers are configured');
  }

  const errors = [];

  for (const provider of availableProviders) {
    try {
      const result = await provider.call(messages);
      return result;
    } catch (error) {
      errors.push({ provider: provider.name, error: error.message });
    }
  }

  throw new ApiError(503, 'LLM service temporarily unavailable');
};

const getAvailableProviders = () =>
  providers.filter((p) => p.isAvailable()).map((p) => p.name);

const getProviderStatus = () =>
  providers.map((p) => ({ name: p.name, available: p.isAvailable() }));

export default { generateAnswer, getAvailableProviders, getProviderStatus };
