import { routeQuestion, OUT_OF_SCOPE_RESPONSE, GREETING_RESPONSE } from './question-router.service.js';
import { retrieveRelevantChunks } from './rag.service.js';
import llmService from './llm.service.js';
import { sanitizeContent } from './llm.service.js';
import ApiError from '../utils/api-error.js';

const METADATA_PATTERN = /\[?(?:User[- ]?(?:Safety|Sensitivity)|Content[- ]?(?:Safety|Filter|Rating)|Safety[- ]?(?:Rating|Level|Score)|Harm[- ]?(?:Category|Categories)|Blocked)[- ]?:[- ]?\w+\]?/i;

const MENTRIV_SYSTEM_INSTRUCTIONS =
  'You are Mentriv AI, a helpful assistant for the Mentriv EdTech learning platform. Answer the user question based on the provided context. Be concise, accurate, and friendly. If the context does not contain enough information to answer, say so clearly.';

const GENERAL_SYSTEM_INSTRUCTIONS =
  'You are a helpful educational assistant. Answer the user question clearly and concisely. Focus on providing accurate, educational information.';

const SYSTEM_INSTRUCTIONS_BY_ROUTE = {
  mentriv: MENTRIV_SYSTEM_INSTRUCTIONS,
  general: GENERAL_SYSTEM_INSTRUCTIONS,
};

const CHATBOT_UNAVAILABLE_MSG = 'Chatbot is temporarily unavailable. Please try again later.';

const createChatService = ({
  rag = { retrieveRelevantChunks },
  llm = llmService,
  router = { routeQuestion },
} = {}) => {
  const sendMessage = async ({ message }) => {
    const routing = router.routeQuestion(message);

    if (routing.route === 'out_of_scope') {
      return {
        reply: OUT_OF_SCOPE_RESPONSE,
        route: routing.route,
        timestamp: new Date().toISOString(),
      };
    }

    if (routing.route === 'greeting') {
      return {
        reply: GREETING_RESPONSE,
        route: routing.route,
        timestamp: new Date().toISOString(),
      };
    }

    try {
      if (routing.route === 'mentriv') {
        const { chunks } = await rag.retrieveRelevantChunks({ query: message });

        const reply = await llm.generateAnswer({
          systemInstructions: MENTRIV_SYSTEM_INSTRUCTIONS,
          question: message,
          context: chunks.length > 0 ? chunks : null,
        });

        const sanitized = sanitizeContent(reply);

        return {
          reply: sanitized,
          route: routing.route,
          ragUsed: chunks.length > 0,
          sources: chunks.map((c) => c.metadata?.source_file).filter(Boolean),
          timestamp: new Date().toISOString(),
        };
      }

      const reply = await llm.generateAnswer({
        systemInstructions: GENERAL_SYSTEM_INSTRUCTIONS,
        question: message,
      });

      const sanitized = sanitizeContent(reply);

      return {
        reply: sanitized,
        route: routing.route,
        ragUsed: false,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error(`[chat] sendMessage failed: ${error.message}`);
      throw new ApiError(503, CHATBOT_UNAVAILABLE_MSG);
    }
  };

  const prepareStream = async ({ message }) => {
    const routing = router.routeQuestion(message);

    if (routing.route === 'out_of_scope' || routing.route === 'greeting') {
      return { routing, context: null, chunks: [] };
    }

    let chunks = [];
    if (routing.route === 'mentriv') {
      const result = await rag.retrieveRelevantChunks({ query: message });
      chunks = result.chunks;
    }

    return { routing, context: chunks.length > 0 ? chunks : null, chunks };
  };

  const streamAnswer = async ({ message, onToken, onDone, onError }) => {
    let routing;
    let context;
    let chunks;

    try {
      ({ routing, context, chunks } = await prepareStream({ message }));
    } catch (error) {
      console.error(`[chat] prepareStream failed: ${error.message}`);
      onError(new ApiError(503, CHATBOT_UNAVAILABLE_MSG));
      return;
    }

    if (routing.route === 'out_of_scope') {
      onToken(OUT_OF_SCOPE_RESPONSE);
      onDone({
        route: routing.route,
        ragUsed: false,
        sources: [],
      });
      return;
    }

    if (routing.route === 'greeting') {
      onToken(GREETING_RESPONSE);
      onDone({
        route: routing.route,
        ragUsed: false,
        sources: [],
      });
      return;
    }

    const systemInstructions = SYSTEM_INSTRUCTIONS_BY_ROUTE[routing.route];

    try {
      const { stream, provider } = await llm.generateAnswerStream({
        systemInstructions,
        question: message,
        context,
      });

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let metadataDetected = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const token = parsed.choices?.[0]?.delta?.content;
              if (token) {
                if (!metadataDetected) {
                  const candidate = fullContent + token;
                  if (METADATA_PATTERN.test(candidate)) {
                    metadataDetected = true;
                  } else {
                    fullContent += token;
                    onToken(token);
                  }
                }
              }
            } catch {
              // Skip malformed JSON chunks
            }
          }
        }
      }

      onDone({
        route: routing.route,
        ragUsed: chunks.length > 0,
        sources: chunks.map((c) => c.metadata?.source_file).filter(Boolean),
        provider,
      });
    } catch (error) {
      console.error(`[chat] streamAnswer failed: ${error.message}`);
      onError(new ApiError(503, CHATBOT_UNAVAILABLE_MSG));
    }
  };

  return { sendMessage, prepareStream, streamAnswer };
};

const defaultChatService = createChatService();

export default defaultChatService;
export { createChatService };
