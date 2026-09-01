import env from '../config/env.js';
import ApiError from '../utils/api-error.js';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const generateAnswer = async ({
  systemInstructions,
  question,
  context = null,
} = {}) => {
  if (!env.openrouterApiKey) {
    throw new ApiError(500, 'LLM service is not configured');
  }

  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    throw new ApiError(400, 'Question is required');
  }

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

  let response;
  try {
    response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': env.appFrontendUrl || 'http://localhost:5173',
        'X-Title': 'Mentriv AI Chatbot',
      },
      body: JSON.stringify({
        model: env.llmModel,
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });
  } catch (error) {
    throw new ApiError(502, 'Failed to connect to LLM provider');
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new ApiError(502, 'LLM provider request failed');
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(502, 'Invalid response from LLM provider');
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new ApiError(502, 'Empty response from LLM provider');
  }

  return content.trim();
};

export default { generateAnswer };
