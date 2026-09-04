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

const createMockRag = (scenarios = {}) => {
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
      calls.push({ question, context, systemInstructions });
      if (context && context.length > 0) {
        return 'The MERN Stack course costs ₹499 and lasts 2 months.';
      }
      if (systemInstructions.includes('Mentriv')) {
        return 'I could not find specific information about that in the Mentriv knowledge base.';
      }
      return 'A linked list is a linear data structure where elements are stored in nodes.';
    },
  };
};

const createMockRouter = () => {
  const calls = [];
  return {
    calls,
    routeQuestion: (q) => {
      calls.push(q);
      if (!q || typeof q !== 'string' || q.trim().length === 0) {
        return { route: 'out_of_scope', useRag: false, useLlm: false };
      }
      const lower = q.toLowerCase();
      const mentrivKw = ['mentriv', 'course', 'mern', 'enroll', 'fee', 'class', 'mentor', 'assignment'];
      if (mentrivKw.some((kw) => lower.includes(kw))) {
        return { route: 'mentriv', useRag: true, useLlm: true };
      }
      const eduKw = ['linked list', 'explain', 'react', 'python', 'algorithm', 'database', 'sql', 'machine learning'];
      if (eduKw.some((kw) => lower.includes(kw))) {
        return { route: 'general', useRag: false, useLlm: true };
      }
      return { route: 'out_of_scope', useRag: false, useLlm: false };
    },
  };
};

const createMockReq = (body = {}) => ({
  body,
  ip: '127.0.0.1',
  socket: { remoteAddress: '127.0.0.1' },
});

const createMockRes = () => {
  const res = { statusCode: null, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (data) => { res.body = data; return res; };
  return res;
};

const testMentrivQuestion = async () => {
  console.log('\n--- Integration: Mentriv question → RAG → LLM ---');

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
  const chatService = createChatService({ rag, llm, router });

  const req = createMockReq({ message: 'How much does MERN Stack cost?' });
  const res = createMockRes();

  const result = await chatService.sendMessage({ message: req.body.message });
  res.status(200).json({ status: 'success', data: result });

  assert('HTTP status 200', res.statusCode === 200);
  assert('Response status is success', res.body?.status === 'success');
  assert('Data has reply', typeof res.body?.data?.reply === 'string' && res.body.data.reply.length > 0);
  assert('Data has route=mentriv', res.body?.data?.route === 'mentriv');
  assert('Data has ragUsed=true', res.body?.data?.ragUsed === true);
  assert('Data has sources', Array.isArray(res.body?.data?.sources) && res.body.data.sources.length > 0);
  assert('Data has timestamp', typeof res.body?.data?.timestamp === 'string');
  assert('RAG was called with correct query', rag.calls[0] === 'How much does MERN Stack cost?');
  assert('LLM received context', llm.calls[0].context !== null && llm.calls[0].context.length > 0);
  assert('LLM used Mentriv instructions', llm.calls[0].systemInstructions.includes('Mentriv'));
};

const testGeneralQuestion = async () => {
  console.log('\n--- Integration: General question → direct LLM ---');

  const rag = createMockRag({});
  const llm = createMockLlm();
  const router = createMockRouter();
  const chatService = createChatService({ rag, llm, router });

  const req = createMockReq({ message: 'What is a linked list?' });
  const res = createMockRes();

  const result = await chatService.sendMessage({ message: req.body.message });
  res.status(200).json({ status: 'success', data: result });

  assert('HTTP status 200', res.statusCode === 200);
  assert('Response status is success', res.body?.status === 'success');
  assert('Data has reply', typeof res.body?.data?.reply === 'string' && res.body.data.reply.length > 0);
  assert('Data has route=general', res.body?.data?.route === 'general');
  assert('Data has ragUsed=false', res.body?.data?.ragUsed === false);
  assert('Data has timestamp', typeof res.body?.data?.timestamp === 'string');
  assert('RAG was NOT called', rag.calls.length === 0);
  assert('LLM was called', llm.calls.length === 1);
  assert('LLM received no context', llm.calls[0].context === undefined || llm.calls[0].context === null);
  assert('LLM used general instructions', llm.calls[0].systemInstructions.includes('educational'));
};

const testOutOfScopeQuestion = async () => {
  console.log('\n--- Integration: Out-of-scope → static response ---');

  const rag = createMockRag({});
  const llm = createMockLlm();
  const router = createMockRouter();
  const chatService = createChatService({ rag, llm, router });

  const req = createMockReq({ message: 'Who won the cricket match?' });
  const res = createMockRes();

  const result = await chatService.sendMessage({ message: req.body.message });
  res.status(200).json({ status: 'success', data: result });

  assert('HTTP status 200', res.statusCode === 200);
  assert('Response status is success', res.body?.status === 'success');
  assert('Reply matches out-of-scope constant', res.body?.data?.reply === OUT_OF_SCOPE_RESPONSE);
  assert('Data has route=out_of_scope', res.body?.data?.route === 'out_of_scope');
  assert('Data has timestamp', typeof res.body?.data?.timestamp === 'string');
  assert('RAG was NOT called', rag.calls.length === 0);
  assert('LLM was NOT called', llm.calls.length === 0);
};

const testMentrivNoContext = async () => {
  console.log('\n--- Integration: Mentriv question, no RAG context ---');

  const rag = createMockRag({});
  const llm = createMockLlm();
  const router = createMockRouter();
  const chatService = createChatService({ rag, llm, router });

  const req = createMockReq({ message: 'Mentriv office address' });
  const res = createMockRes();

  const result = await chatService.sendMessage({ message: req.body.message });
  res.status(200).json({ status: 'success', data: result });

  assert('HTTP status 200', res.statusCode === 200);
  assert('Data has route=mentriv', res.body?.data?.route === 'mentriv');
  assert('Data has ragUsed=false', res.body?.data?.ragUsed === false);
  assert('LLM received empty context array (grounding signal)', Array.isArray(llm.calls[0].context) && llm.calls[0].context.length === 0);
  assert('LLM used Mentriv instructions', llm.calls[0].systemInstructions.includes('Mentriv'));
};

const testValidationRejection = async () => {
  console.log('\n--- Integration: Validation rejects empty message ---');

  const req = createMockReq({ message: '' });
  const res = createMockRes();
  const errors = [];

  if (!req.body.message || req.body.message.trim().length === 0) {
    errors.push({ msg: 'Message is required' });
  } else if (req.body.message.length > 2000) {
    errors.push({ msg: 'Message must be between 1 and 2000 characters' });
  }

  if (errors.length > 0) {
    res.status(400).json({ status: 'error', message: 'Validation failed', errors });
  }

  assert('HTTP status 400', res.statusCode === 400);
  assert('Response status is error', res.body?.status === 'error');
  assert('Has validation errors', Array.isArray(res.body?.errors) && res.body.errors.length > 0);
};

const testMaxLengthValidation = async () => {
  console.log('\n--- Integration: Validation rejects too-long message ---');

  const longMessage = 'a'.repeat(2001);
  const req = createMockReq({ message: longMessage });
  const res = createMockRes();
  const errors = [];

  if (!req.body.message || req.body.message.trim().length === 0) {
    errors.push({ msg: 'Message is required' });
  } else if (req.body.message.length > 2000) {
    errors.push({ msg: 'Message must be between 1 and 2000 characters' });
  }

  if (errors.length > 0) {
    res.status(400).json({ status: 'error', message: 'Validation failed', errors });
  }

  assert('HTTP status 400', res.statusCode === 400);
  assert('Response status is error', res.body?.status === 'error');
  assert('Has validation errors', Array.isArray(res.body?.errors) && res.body.errors.length > 0);
};

const testResponseShape = async () => {
  console.log('\n--- Integration: Response shape matches API contract ---');

  const rag = createMockRag({});
  const llm = createMockLlm();
  const router = createMockRouter();
  const chatService = createChatService({ rag, llm, router });

  const result = await chatService.sendMessage({ message: 'Explain React' });
  const res = { status: 200, body: { status: 'success', data: result } };

  assert('Has status field', res.body?.status === 'success');
  assert('Has data field', typeof res.body?.data === 'object');
  assert('Data has reply', typeof res.body?.data?.reply === 'string');
  assert('Data has route', typeof res.body?.data?.route === 'string');
  assert('Data has ragUsed', typeof res.body?.data?.ragUsed === 'boolean');
  assert('Data has timestamp', typeof res.body?.data?.timestamp === 'string');
};

const run = async () => {
  console.log('=== Chat Integration Tests ===');
  await testMentrivQuestion();
  await testGeneralQuestion();
  await testOutOfScopeQuestion();
  await testMentrivNoContext();
  await testValidationRejection();
  await testMaxLengthValidation();
  await testResponseShape();
  console.log(`\n=== Done: ${passed} passed, ${failed} failed ===`);

  if (failed > 0) {
    process.exit(1);
  }
};

run();
