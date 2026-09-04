import env from '../config/env.js';
import ApiError from '../utils/api-error.js';

const PROVIDER_TIMEOUT_MS = 30000;
const DEFAULT_TEMPERATURE = 0.7;

const normalize = (text) => text.toLowerCase().trim();

const sanitizeContent = (text) => {
  if (!text) return text;

  const metadataPatterns = [
    /\n?\s*\[?(?:User[- ]?(?:Safety|Sensitivity))[- ]?:[- ]?\w+\]?/gi,
    /\n?\s*\[?(?:Content[- ]?(?:Safety|Filter|Rating))[- ]?:[- ]?\w+\]?/gi,
    /\n?\s*\[?(?:Safety[- ]?(?:Rating|Level|Score))[- ]?:[- ]?\w+\]?/gi,
    /\n?\s*\[?(?:Harm[- ]?(?:Category|Categories))[- ]?:[- ]?[^\n]*/gi,
    /\n?\s*\[?Blocked[- ]?:[- ]?\w+\]?/gi,
  ];

  let cleaned = text;
  for (const pattern of metadataPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  return cleaned.trim();
};

const EMPTY_CONTEXT_INSTRUCTIONS =
  'No relevant information was found in the Mentriv knowledge base for this question. Clearly state that the specific information is not available in the Mentriv knowledge base. Do not guess or invent phone numbers, emails, prices, policies, schedules, or any other facts.';

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
  } else if (Array.isArray(context) && context.length === 0) {
    messages.push({ role: 'system', content: EMPTY_CONTEXT_INSTRUCTIONS });
  }

  messages.push({ role: 'user', content: question });
  return messages;
};

const callOpenAICompatible = async ({ url, apiKey, model, messages, temperature = DEFAULT_TEMPERATURE, extraHeaders = {} }) => {
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
        temperature,
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

    const sanitized = sanitizeContent(content);
    if (!sanitized) {
      throw new Error('Empty response after sanitization');
    }

    return sanitized;
  } finally {
    clearTimeout(timeout);
  }
};

const callGemini = async ({ apiKey, model, messages, temperature = DEFAULT_TEMPERATURE }) => {
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

    const body = { contents, generationConfig: { temperature } };
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

    const sanitized = sanitizeContent(content);
    if (!sanitized) {
      throw new Error('Empty response after sanitization');
    }

    return sanitized;
  } finally {
    clearTimeout(timeout);
  }
};

const callOpenAICompatibleStreaming = async ({ url, apiKey, model, messages, temperature = DEFAULT_TEMPERATURE, extraHeaders = {} }) => {
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
        temperature,
        max_tokens: 1024,
        stream: true,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.body;
  } finally {
    clearTimeout(timeout);
  }
};

const callGeminiStreaming = async ({ apiKey, model, messages, temperature = DEFAULT_TEMPERATURE }) => {
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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;

    const body = { contents, generationConfig: { temperature } };
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

    return response.body;
  } finally {
    clearTimeout(timeout);
  }
};

const providers = [
  {
    name: 'openrouter',
    isAvailable: () => Boolean(env.openrouterApiKey),
    call: async (messages, options = {}) =>
      callOpenAICompatible({
        url: 'https://openrouter.ai/api/v1/chat/completions',
        apiKey: env.openrouterApiKey,
        model: env.llmModel,
        messages,
        temperature: options.temperature,
        extraHeaders: {
          'HTTP-Referer': env.appFrontendUrl || 'http://localhost:5173',
          'X-Title': 'Mentriv AI Chatbot',
        },
      }),
    stream: async (messages, options = {}) =>
      callOpenAICompatibleStreaming({
        url: 'https://openrouter.ai/api/v1/chat/completions',
        apiKey: env.openrouterApiKey,
        model: env.llmModel,
        messages,
        temperature: options.temperature,
        extraHeaders: {
          'HTTP-Referer': env.appFrontendUrl || 'http://localhost:5173',
          'X-Title': 'Mentriv AI Chatbot',
        },
      }),
  },
  {
    name: 'groq',
    isAvailable: () => Boolean(env.groqApiKey),
    call: async (messages, options = {}) =>
      callOpenAICompatible({
        url: 'https://api.groq.com/openai/v1/chat/completions',
        apiKey: env.groqApiKey,
        model: env.groqModel,
        messages,
        temperature: options.temperature,
      }),
    stream: async (messages, options = {}) =>
      callOpenAICompatibleStreaming({
        url: 'https://api.groq.com/openai/v1/chat/completions',
        apiKey: env.groqApiKey,
        model: env.groqModel,
        messages,
        temperature: options.temperature,
      }),
  },
  {
    name: 'gemini',
    isAvailable: () => Boolean(env.geminiApiKey),
    call: async (messages, options = {}) =>
      callGemini({
        apiKey: env.geminiApiKey,
        model: env.geminiModel,
        messages,
        temperature: options.temperature,
      }),
    stream: async (messages, options = {}) =>
      callGeminiStreaming({
        apiKey: env.geminiApiKey,
        model: env.geminiModel,
        messages,
        temperature: options.temperature,
      }),
  },
];

const generateAnswer = async ({
  systemInstructions,
  question,
  context = null,
  temperature = DEFAULT_TEMPERATURE,
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
      const result = await provider.call(messages, { temperature });
      return result;
    } catch (error) {
      errors.push({ provider: provider.name, error: error.message });
    }
  }

  throw new ApiError(503, 'LLM service temporarily unavailable');
};

const generateAnswerStream = async ({
  systemInstructions,
  question,
  context = null,
  temperature = DEFAULT_TEMPERATURE,
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
      const stream = await provider.stream(messages, { temperature });
      return { stream, provider: provider.name };
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

export default { generateAnswer, generateAnswerStream, getAvailableProviders, getProviderStatus };
export { sanitizeContent };
