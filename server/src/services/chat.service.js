import { routeQuestion, OUT_OF_SCOPE_RESPONSE } from './question-router.service.js';
import { retrieveRelevantChunks } from './rag.service.js';
import llmService from './llm.service.js';

const MENTRIV_SYSTEM_INSTRUCTIONS =
  'You are Mentriv AI, a helpful assistant for the Mentriv EdTech learning platform. Answer the user question based on the provided context. Be concise, accurate, and friendly. If the context does not contain enough information to answer, say so clearly.';

const GENERAL_SYSTEM_INSTRUCTIONS =
  'You are a helpful educational assistant. Answer the user question clearly and concisely. Focus on providing accurate, educational information.';

const SYSTEM_INSTRUCTIONS_BY_ROUTE = {
  mentriv: MENTRIV_SYSTEM_INSTRUCTIONS,
  general: GENERAL_SYSTEM_INSTRUCTIONS,
};

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

    if (routing.route === 'mentriv') {
      const { chunks } = await rag.retrieveRelevantChunks({ query: message });

      const reply = await llm.generateAnswer({
        systemInstructions: MENTRIV_SYSTEM_INSTRUCTIONS,
        question: message,
        context: chunks.length > 0 ? chunks : null,
      });

      return {
        reply,
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

    return {
      reply,
      route: routing.route,
      ragUsed: false,
      timestamp: new Date().toISOString(),
    };
  };

  const prepareStream = async ({ message }) => {
    const routing = router.routeQuestion(message);

    if (routing.route === 'out_of_scope') {
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
    const { routing, context, chunks } = await prepareStream({ message });

    if (routing.route === 'out_of_scope') {
      onToken(OUT_OF_SCOPE_RESPONSE);
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
                fullContent += token;
                onToken(token);
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
      onError(error);
    }
  };

  return { sendMessage, prepareStream, streamAnswer };
};

const defaultChatService = createChatService();

export default defaultChatService;
export { createChatService };
