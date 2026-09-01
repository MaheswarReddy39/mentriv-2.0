import { routeQuestion, OUT_OF_SCOPE_RESPONSE } from './question-router.service.js';
import { retrieveRelevantChunks } from './rag.service.js';
import llmService from './llm.service.js';

const MENTRIV_SYSTEM_INSTRUCTIONS =
  'You are Mentriv AI, a helpful assistant for the Mentriv EdTech learning platform. Answer the user question based on the provided context. Be concise, accurate, and friendly. If the context does not contain enough information to answer, say so clearly.';

const GENERAL_SYSTEM_INSTRUCTIONS =
  'You are a helpful educational assistant. Answer the user question clearly and concisely. Focus on providing accurate, educational information.';

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

  return { sendMessage };
};

const defaultChatService = createChatService();

export default defaultChatService;
export { createChatService };
