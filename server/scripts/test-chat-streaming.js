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

const createMockStream = (tokens) => {
  let sent = [];
  let callCount = 0;
  const totalCalls = tokens.length + 1;
  return {
    sent,
    stream: {
      getReader: () => ({
        read: async () => {
          if (callCount < tokens.length) {
            const token = tokens[callCount++];
            const data = JSON.stringify({ choices: [{ delta: { content: token } }] });
            const encoded = new TextEncoder().encode(`data: ${data}\n\n`);
            return { done: false, value: encoded };
          }
          if (callCount === tokens.length) {
            callCount++;
            const done = new TextEncoder().encode('data: [DONE]\n\n');
            return { done: false, value: done };
          }
          return { done: true, value: undefined };
        },
        releaseLock: () => {},
      }),
    },
  };
};

const createMockLlm = (streamTokens = ['Hello', ' world', '!']) => {
  const calls = [];
  return {
    calls,
    generateAnswer: async ({ question, context }) => {
      calls.push({ question, context });
      if (context && context.length > 0) {
        return 'The MERN Stack course costs ₹499.';
      }
      return 'A linked list is a linear data structure.';
    },
    generateAnswerStream: async ({ question, context }) => {
      calls.push({ question, context, streaming: true });
      const mock = createMockStream(streamTokens);
      return { stream: mock.stream, provider: 'mock-provider' };
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
      const mentrivKw = ['mentriv', 'course', 'mern', 'enroll', 'fee', 'class'];
      if (mentrivKw.some((kw) => lower.includes(kw))) {
        return { route: 'mentriv', useRag: true, useLlm: true };
      }
      const eduKw = ['linked list', 'explain', 'react', 'python', 'algorithm'];
      if (eduKw.some((kw) => lower.includes(kw))) {
        return { route: 'general', useRag: false, useLlm: true };
      }
      return { route: 'out_of_scope', useRag: false, useLlm: false };
    },
  };
};

const collectStream = (chatService, message) => {
  return new Promise((resolve) => {
    const tokens = [];
    const meta = {};
    let error = null;

    chatService.streamAnswer({
      message,
      onToken: (token) => tokens.push(token),
      onDone: (m) => Object.assign(meta, m),
      onError: (e) => { error = e; },
    }).then(() => {
      resolve({ tokens, meta, error, fullText: tokens.join('') });
    });
  });
};

const testMentrivStream = async () => {
  console.log('\n--- Streaming: Mentriv question → RAG → LLM ---');

  const rag = createMockRag({
    'How much does MERN Stack cost?': {
      chunks: [
        { id: '1', text: 'MERN costs 499', metadata: { source_file: 'courses/courses.md' } },
      ],
      hasRelevantContext: true,
    },
  });
  const llm = createMockLlm(['The', ' MERN', ' course', ' costs', ' ₹499.']);
  const router = createMockRouter();
  const service = createChatService({ rag, llm, router });

  const { tokens, meta, fullText } = await collectStream(service, 'How much does MERN Stack cost?');

  assert('Received tokens', tokens.length > 0, `count: ${tokens.length}`);
  assert('Full text assembled', fullText.length > 0, `text: "${fullText}"`);
  assert('Route is mentriv', meta.route === 'mentriv');
  assert('ragUsed is true', meta.ragUsed === true);
  assert('Sources included', Array.isArray(meta.sources) && meta.sources.length > 0);
  assert('RAG was called', rag.calls.length === 1);
  assert('LLM stream was called', llm.calls.length === 1);
  assert('LLM received context', llm.calls[0].context !== null);
};

const testGeneralStream = async () => {
  console.log('\n--- Streaming: General question → direct LLM ---');

  const rag = createMockRag({});
  const llm = createMockLlm(['A', ' linked', ' list', ' is', ' linear.']);
  const router = createMockRouter();
  const service = createChatService({ rag, llm, router });

  const { tokens, meta, fullText } = await collectStream(service, 'Explain linked list');

  assert('Received tokens', tokens.length > 0, `count: ${tokens.length}`);
  assert('Full text assembled', fullText.length > 0);
  assert('Route is general', meta.route === 'general');
  assert('ragUsed is false', meta.ragUsed === false);
  assert('RAG was NOT called', rag.calls.length === 0);
  assert('LLM stream was called', llm.calls.length === 1);
  assert('LLM received no context', llm.calls[0].context === null);
};

const testOutOfScopeStream = async () => {
  console.log('\n--- Streaming: Out-of-scope → static response ---');

  const rag = createMockRag({});
  const llm = createMockLlm(['should not be called']);
  const router = createMockRouter();
  const service = createChatService({ rag, llm, router });

  const { tokens, meta, fullText } = await collectStream(service, 'Who won the cricket match?');

  assert('Static response sent', fullText === OUT_OF_SCOPE_RESPONSE);
  assert('Route is out_of_scope', meta.route === 'out_of_scope');
  assert('ragUsed is false', meta.ragUsed === false);
  assert('RAG was NOT called', rag.calls.length === 0);
  assert('LLM stream was NOT called', llm.calls.length === 0);
};

const testStreamCompletion = async () => {
  console.log('\n--- Streaming: Completion event fires ---');

  const rag = createMockRag({});
  const llm = createMockLlm(['Hello']);
  const router = createMockRouter();
  const service = createChatService({ rag, llm, router });

  const events = [];
  await service.streamAnswer({
    message: 'Explain React',
    onToken: (t) => events.push({ type: 'token', data: t }),
    onDone: (m) => events.push({ type: 'done', data: m }),
    onError: () => events.push({ type: 'error' }),
  });

  const tokenEvents = events.filter((e) => e.type === 'token');
  const doneEvents = events.filter((e) => e.type === 'done');

  assert('Token events received', tokenEvents.length > 0);
  assert('Done event received', doneEvents.length === 1);
  assert('Done event has route', typeof doneEvents[0]?.data?.route === 'string');
  assert('Done event has ragUsed', typeof doneEvents[0]?.data?.ragUsed === 'boolean');
  assert('No error events', events.filter((e) => e.type === 'error').length === 0);
};

const testStreamError = async () => {
  console.log('\n--- Streaming: Error handling ---');

  const rag = createMockRag({});
  const llm = {
    calls: [],
    generateAnswer: async () => { throw new Error('fail'); },
    generateAnswerStream: async () => { throw new Error('Provider failed'); },
  };
  const router = createMockRouter();
  const service = createChatService({ rag, llm, router });

  const events = [];
  await service.streamAnswer({
    message: 'Explain Python',
    onToken: (t) => events.push({ type: 'token', data: t }),
    onDone: (m) => events.push({ type: 'done', data: m }),
    onError: (e) => events.push({ type: 'error', data: e.message || String(e) }),
  });

  const errorEvents = events.filter((e) => e.type === 'error');
  const tokenEvents = events.filter((e) => e.type === 'token');

  assert('Error event received', errorEvents.length === 1);
  assert('No token events', tokenEvents.length === 0);
  assert('Error has message', typeof errorEvents[0]?.data === 'string' && errorEvents[0].data.length > 0);
};

const testPrepareStream = async () => {
  console.log('\n--- Streaming: prepareStream routing ---');

  const rag = createMockRag({
    'MERN course details': {
      chunks: [{ id: '1', text: 'MERN info', metadata: { source_file: 'courses.md' } }],
      hasRelevantContext: true,
    },
  });
  const llm = createMockLlm();
  const router = createMockRouter();
  const service = createChatService({ rag, llm, router });

  const outOfScope = await service.prepareStream({ message: '' });
  assert('Empty → out_of_scope', outOfScope.routing.route === 'out_of_scope');

  const mentriv = await service.prepareStream({ message: 'MERN course details' });
  assert('Mentriv → mentriv route', mentriv.routing.route === 'mentriv');
  assert('Mentriv → chunks from RAG', Array.isArray(mentriv.chunks) && mentriv.chunks.length > 0);
  assert('RAG was called', rag.calls.length === 1);

  const general = await service.prepareStream({ message: 'Explain recursion' });
  assert('General → general route', general.routing.route === 'general');
  assert('General → no context', general.context === null);
};

const run = async () => {
  console.log('=== Streaming Tests ===');
  await testMentrivStream();
  await testGeneralStream();
  await testOutOfScopeStream();
  await testStreamCompletion();
  await testStreamError();
  await testPrepareStream();
  console.log(`\n=== Done: ${passed} passed, ${failed} failed ===`);

  if (failed > 0) {
    process.exit(1);
  }
};

run();
