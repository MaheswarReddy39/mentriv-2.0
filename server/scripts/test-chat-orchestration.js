import { createChatService } from '../src/services/chat.service.js';
import { OUT_OF_SCOPE_RESPONSE } from '../src/services/question-router.service.js';

let passed = 0;
let failed = 0;

const assert = (label, condition, detail = '') => {
  if (condition) {
    passed++;
    console.log(`  PASS  ${label}${detail ? ` — ${detail}` : ''}`);
  } else {
    failed++;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
};

const createMockRag = (scenarios) => {
  const calls = [];
  return {
    calls,
    retrieveRelevantChunks: async ({ query }) => {
      calls.push(query);
      if (scenarios[query]) return scenarios[query];
      return { chunks: [], hasRelevantContext: false };
    },
  };
};

const createMockLlm = () => {
  const calls = [];
  return {
    calls,
    generateAnswer: async ({ systemInstructions, question, context }) => {
      calls.push({ question, context });
      if (context && context.length > 0) {
        return 'The MERN Stack course costs ₹499.';
      }
      return 'A linked list is a linear data structure.';
    },
  };
};

const createMockRouter = () => {
  const calls = [];
  return {
    calls,
    routeQuestion: (q) => {
      calls.push(q);
      if (!q || typeof q !== 'string') {
        return { route: 'out_of_scope', useRag: false, useLlm: false };
      }
      const lower = q.toLowerCase();
      const keywords = ['mentriv', 'course', 'mern', 'enroll', 'fee', 'class'];
      if (keywords.some((kw) => lower.includes(kw))) {
        return { route: 'mentriv', useRag: true, useLlm: true };
      }
      return { route: 'general', useRag: false, useLlm: true };
    },
  };
};

const testMentrivQuestionUsesRAG = async () => {
  console.log('\n--- Mentriv question: RAG + LLM ---');

  const rag = createMockRag({
    'How much does MERN Stack cost?': {
      chunks: [
        { id: '1', text: 'MERN Stack costs 499', metadata: { source_file: 'courses/courses.md' } },
      ],
      hasRelevantContext: true,
    },
  });
  const llm = createMockLlm();
  const router = createMockRouter();
  const service = createChatService({ rag, llm, router });

  const result = await service.sendMessage({ message: 'How much does MERN Stack cost?' });

  assert('Route is mentriv', result.route === 'mentriv');
  assert('RAG was called', rag.calls.length === 1);
  assert('RAG received correct query', rag.calls[0] === 'How much does MERN Stack cost?');
  assert('LLM was called', llm.calls.length === 1);
  assert('LLM received context', llm.calls[0].context !== null && llm.calls[0].context.length > 0);
  assert('Result has ragUsed=true', result.ragUsed === true);
  assert('Result has sources', Array.isArray(result.sources) && result.sources.length > 0);
  assert('Reply is non-empty', typeof result.reply === 'string' && result.reply.length > 0);
  assert('Has timestamp', typeof result.timestamp === 'string');
};

const testGeneralQuestionSkipsRAG = async () => {
  console.log('\n--- General question: LLM only, no RAG ---');

  const rag = createMockRag({});
  const llm = createMockLlm();
  const router = createMockRouter();
  const service = createChatService({ rag, llm, router });

  const result = await service.sendMessage({ message: 'What is a linked list?' });

  assert('Route is general', result.route === 'general');
  assert('RAG was NOT called', rag.calls.length === 0);
  assert('LLM was called', llm.calls.length === 1);
  assert('LLM received no context', llm.calls[0].context === undefined || llm.calls[0].context === null);
  assert('Result has ragUsed=false', result.ragUsed === false);
  assert('Reply is non-empty', typeof result.reply === 'string' && result.reply.length > 0);
  assert('Has timestamp', typeof result.timestamp === 'string');
};

const testOutOfScopeSkipsRAGAndLLM = async () => {
  console.log('\n--- Out-of-scope: no RAG, no LLM ---');

  const rag = createMockRag({});
  const llm = createMockLlm();
  const router = createMockRouter();
  const service = createChatService({ rag, llm, router });

  const result = await service.sendMessage({ message: '' });

  assert('Route is out_of_scope', result.route === 'out_of_scope');
  assert('RAG was NOT called', rag.calls.length === 0);
  assert('LLM was NOT called', llm.calls.length === 0);
  assert('Reply matches constant', result.reply === OUT_OF_SCOPE_RESPONSE);
  assert('Has timestamp', typeof result.timestamp === 'string');
};

const testMentrivNoRelevantChunks = async () => {
  console.log('\n--- Mentriv question with no relevant chunks ---');

  const rag = createMockRag({});
  const llm = createMockLlm();
  const router = createMockRouter();
  const service = createChatService({ rag, llm, router });

  const result = await service.sendMessage({ message: 'Mentriv campus address' });

  assert('Route is mentriv', result.route === 'mentriv');
  assert('RAG was called', rag.calls.length === 1);
  assert('LLM was called without context', llm.calls[0].context === null);
  assert('Result has ragUsed=false', result.ragUsed === false);
};

const run = async () => {
  console.log('=== Chat Orchestration Tests ===');
  await testMentrivQuestionUsesRAG();
  await testGeneralQuestionSkipsRAG();
  await testOutOfScopeSkipsRAGAndLLM();
  await testMentrivNoRelevantChunks();
  console.log(`\n=== Done: ${passed} passed, ${failed} failed ===`);

  if (failed > 0) {
    process.exit(1);
  }
};

run();
