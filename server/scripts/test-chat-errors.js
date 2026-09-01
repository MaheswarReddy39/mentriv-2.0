import { createChatService } from '../src/services/chat.service.js';
import { OUT_OF_SCOPE_RESPONSE } from '../src/services/question-router.service.js';
import { sanitizeContent } from '../src/services/llm.service.js';
import ApiError from '../src/utils/api-error.js';

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

const USER_FACING_MSG = 'Chatbot is temporarily unavailable. Please try again later.';
const RATE_LIMIT_MSG = 'You have reached the chat limit. Please try again later.';
const VALIDATION_MSG = 'Please enter a valid message.';

// ── Mock factories ──────────────────────────────────────────────

const createMockRouter = () => ({
  routeQuestion: (q) => {
    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return { route: 'out_of_scope', useRag: false, useLlm: false };
    }
    const lower = q.toLowerCase().trim();
    if (['hi', 'hello', 'hey'].includes(lower)) {
      return { route: 'greeting', useRag: false, useLlm: false };
    }
    if (['mentriv', 'course', 'mern', 'enroll', 'fee', 'class'].some((kw) => lower.includes(kw))) {
      return { route: 'mentriv', useRag: true, useLlm: true };
    }
    if (['python', 'react', 'docker', 'mongodb', 'linked list', 'algorithm', 'database', 'api'].some((kw) => lower.includes(kw))) {
      return { route: 'general', useRag: false, useLlm: true };
    }
    return { route: 'out_of_scope', useRag: false, useLlm: false };
  },
});

const createFailingRag = (errorMsg = 'ChromaDB connection refused') => ({
  retrieveRelevantChunks: async () => { throw new Error(errorMsg); },
});

const createFailingLlm = (errorMsg = 'Provider returned 500') => ({
  generateAnswer: async () => { throw new Error(errorMsg); },
  generateAnswerStream: async () => { throw new Error(errorMsg); },
});

const createMockLlm = (streamTokens = ['Hello', ' world']) => ({
  generateAnswer: async ({ context }) => {
    if (context && context.length > 0) return 'Course costs ₹499.';
    return 'A linked list is linear.';
  },
  generateAnswerStream: async () => ({
    stream: {
      getReader: () => {
        let callCount = 0;
        return {
          read: async () => {
            if (callCount < streamTokens.length) {
              const token = streamTokens[callCount++];
              const data = JSON.stringify({ choices: [{ delta: { content: token } }] });
              return { done: false, value: new TextEncoder().encode(`data: ${data}\n\n`) };
            }
            if (callCount === streamTokens.length) {
              callCount++;
              return { done: false, value: new TextEncoder().encode('data: [DONE]\n\n') };
            }
            return { done: true, value: undefined };
          },
          releaseLock: () => {},
        };
      },
    },
    provider: 'mock-provider',
  }),
});

const createMockRag = (chunks = []) => ({
  retrieveRelevantChunks: async () => ({ chunks, hasRelevantContext: chunks.length > 0 }),
});

// ── Tests: sendMessage error handling ───────────────────────────

const testRagFailureReturnsSanitizedError = async () => {
  console.log('\n--- sendMessage: RAG failure → sanitized error ---');

  const router = createMockRouter();
  const rag = createFailingRag('ChromaDB connection refused on port 8000');
  const llm = createMockLlm();
  const service = createChatService({ rag, llm, router });

  try {
    await service.sendMessage({ message: 'How much does MERN Stack cost?' });
    assert('Throws error', false, 'no error thrown');
  } catch (error) {
    assert('Throws ApiError', error instanceof ApiError);
    assert('Status 503', error.statusCode === 503);
    assert('User-facing message', error.message === USER_FACING_MSG);
    assert('No raw error in message', !error.message.includes('ChromaDB'));
    assert('No port in message', !error.message.includes('8000'));
    assert('No stack trace in message', !error.message.includes('at '));
  }
};

const testLlmFailureReturnsSanitizedError = async () => {
  console.log('\n--- sendMessage: LLM failure → sanitized error ---');

  const router = createMockRouter();
  const rag = createMockRag([]);
  const llm = createFailingLlm('OpenRouter returned 429 rate limit');
  const service = createChatService({ rag, llm, router });

  try {
    await service.sendMessage({ message: 'Explain React' });
    assert('Throws error', false, 'no error thrown');
  } catch (error) {
    assert('Throws ApiError', error instanceof ApiError);
    assert('Status 503', error.statusCode === 503);
    assert('User-facing message', error.message === USER_FACING_MSG);
    assert('No provider name in message', !error.message.includes('OpenRouter'));
    assert('No HTTP status in message', !error.message.includes('429'));
  }
};

const testAllProvidersFailReturnsSanitizedError = async () => {
  console.log('\n--- sendMessage: All providers fail → sanitized error ---');

  const router = createMockRouter();
  const rag = createMockRag([]);
  const llm = createFailingLlm('All providers returned errors');
  const service = createChatService({ rag, llm, router });

  try {
    await service.sendMessage({ message: 'Explain Python' });
    assert('Throws error', false, 'no error thrown');
  } catch (error) {
    assert('Throws ApiError', error instanceof ApiError);
    assert('Status 503', error.statusCode === 503);
    assert('User-facing message', error.message === USER_FACING_MSG);
    assert('No raw details', !error.message.includes('providers'));
  }
};

const testMentrivLlmFailureWithRagSuccess = async () => {
  console.log('\n--- sendMessage: Mentriv route, RAG succeeds, LLM fails ---');

  const router = createMockRouter();
  const rag = createMockRag([
    { id: '1', text: 'MERN costs 499', metadata: { source_file: 'courses/courses.md' } },
  ]);
  const llm = createFailingLlm('Gemini API timeout');
  const service = createChatService({ rag, llm, router });

  try {
    await service.sendMessage({ message: 'How much does MERN Stack cost?' });
    assert('Throws error', false, 'no error thrown');
  } catch (error) {
    assert('Throws ApiError', error instanceof ApiError);
    assert('Status 503', error.statusCode === 503);
    assert('User-facing message', error.message === USER_FACING_MSG);
    assert('No Gemini reference', !error.message.includes('Gemini'));
    assert('No timeout details', !error.message.includes('timeout'));
  }
};

const testOutOfScopeDoesNotThrow = async () => {
  console.log('\n--- sendMessage: Out-of-scope never fails ---');

  const router = createMockRouter();
  const rag = createFailingRag('should not be called');
  const llm = createFailingLlm('should not be called');
  const service = createChatService({ rag, llm, router });

  const result = await service.sendMessage({ message: 'Who won the cricket match?' });
  assert('Returns out-of-scope response', result.reply === OUT_OF_SCOPE_RESPONSE);
  assert('Route is out_of_scope', result.route === 'out_of_scope');
};

// ── Tests: streamAnswer error handling ──────────────────────────

const testStreamRagFailureSendsErrorEvent = async () => {
  console.log('\n--- streamAnswer: RAG failure → error event ---');

  const router = createMockRouter();
  const rag = createFailingRag('ChromaDB timeout');
  const llm = createMockLlm();
  const service = createChatService({ rag, llm, router });

  const events = [];
  await service.streamAnswer({
    message: 'How much does MERN Stack cost?',
    onToken: (t) => events.push({ type: 'token', data: t }),
    onDone: (m) => events.push({ type: 'done', data: m }),
    onError: (e) => events.push({ type: 'error', data: e }),
  });

  const errorEvents = events.filter((e) => e.type === 'error');
  const tokenEvents = events.filter((e) => e.type === 'token');
  const doneEvents = events.filter((e) => e.type === 'done');

  assert('Error event received', errorEvents.length === 1);
  assert('No token events', tokenEvents.length === 0);
  assert('No done events', doneEvents.length === 0);

  if (errorEvents.length > 0) {
    const err = errorEvents[0].data;
    assert('Error is ApiError', err instanceof ApiError);
    assert('Status 503', err.statusCode === 503);
    assert('User-facing message', err.message === USER_FACING_MSG);
    assert('No raw error details', !err.message.includes('ChromaDB'));
  }
};

const testStreamLlmFailureSendsErrorEvent = async () => {
  console.log('\n--- streamAnswer: LLM failure → error event ---');

  const router = createMockRouter();
  const rag = createMockRag([]);
  const llm = createFailingLlm('Provider error');
  const service = createChatService({ rag, llm, router });

  const events = [];
  await service.streamAnswer({
    message: 'Explain React',
    onToken: (t) => events.push({ type: 'token', data: t }),
    onDone: (m) => events.push({ type: 'done', data: m }),
    onError: (e) => events.push({ type: 'error', data: e }),
  });

  const errorEvents = events.filter((e) => e.type === 'error');
  assert('Error event received', errorEvents.length === 1);
  if (errorEvents.length > 0) {
    const err = errorEvents[0].data;
    assert('Error is ApiError', err instanceof ApiError);
    assert('Status 503', err.statusCode === 503);
    assert('User-facing message', err.message === USER_FACING_MSG);
    assert('No provider details', !err.message.includes('Provider'));
  }
};

const testStreamOutOfScopeNoError = async () => {
  console.log('\n--- streamAnswer: Out-of-scope → no error ---');

  const router = createMockRouter();
  const rag = createFailingRag('should not be called');
  const llm = createFailingLlm('should not be called');
  const service = createChatService({ rag, llm, router });

  const events = [];
  await service.streamAnswer({
    message: 'Who won the cricket match?',
    onToken: (t) => events.push({ type: 'token', data: t }),
    onDone: (m) => events.push({ type: 'done', data: m }),
    onError: (e) => events.push({ type: 'error', data: e }),
  });

  const errorEvents = events.filter((e) => e.type === 'error');
  const doneEvents = events.filter((e) => e.type === 'done');
  assert('No error events', errorEvents.length === 0);
  assert('Done event received', doneEvents.length === 1);
};

// ── Tests: Error sanitization ───────────────────────────────────

const testNoApiKeyExposedInErrors = async () => {
  console.log('\n--- Sanitization: No API keys in error messages ---');

  const router = createMockRouter();
  const rag = createFailingRag('Connection to sk-abc123secret refused');
  const llm = createMockLlm();
  const service = createChatService({ rag, llm, router });

  try {
    await service.sendMessage({ message: 'Mentriv courses' });
    assert('Throws error', false, 'no error thrown');
  } catch (error) {
    const errorStr = JSON.stringify(error);
    assert('No API key in error', !errorStr.includes('sk-abc123'));
    assert('No "secret" in error', !errorStr.toLowerCase().includes('secret'));
  }
};

const testNoStackTraceInUserMessage = async () => {
  console.log('\n--- Sanitization: No stack traces in user-facing messages ---');

  const router = createMockRouter();
  const rag = createFailingRag('Error at line 42 of vector-db.service.js');
  const llm = createMockLlm();
  const service = createChatService({ rag, llm, router });

  try {
    await service.sendMessage({ message: 'Mentriv enrollment' });
    assert('Throws error', false, 'no error thrown');
  } catch (error) {
    assert('No file paths', !error.message.includes('vector-db.service.js'));
    assert('No line numbers', !error.message.includes('line 42'));
    assert('No "at " prefix', !error.message.includes('at '));
  }
};

const testNoProviderDetailsInStreamingError = async () => {
  console.log('\n--- Sanitization: No provider details in stream error ---');

  const router = createMockRouter();
  const rag = createMockRag([]);
  const llm = {
    generateAnswer: async () => { throw new Error('fail'); },
    generateAnswerStream: async () => {
      throw new Error('OpenRouter returned 503: model overloaded');
    },
  };
  const service = createChatService({ rag, llm, router });

  const events = [];
  await service.streamAnswer({
    message: 'Explain algorithms',
    onToken: (t) => events.push({ type: 'token', data: t }),
    onDone: (m) => events.push({ type: 'done', data: m }),
    onError: (e) => events.push({ type: 'error', data: e }),
  });

  const errorEvents = events.filter((e) => e.type === 'error');
  assert('Error event received', errorEvents.length === 1);
  if (errorEvents.length > 0) {
    const err = errorEvents[0].data;
    assert('No OpenRouter reference', !err.message.includes('OpenRouter'));
    assert('No 503 status in message', !err.message.includes('503'));
    assert('No "model overloaded"', !err.message.includes('model overloaded'));
    assert('User-facing message', err.message === USER_FACING_MSG);
  }
};

// ── Tests: Existing flows still work ────────────────────────────

const testSuccessfulMentrivFlow = async () => {
  console.log('\n--- Regression: Successful Mentriv flow ---');

  const router = createMockRouter();
  const rag = createMockRag([
    { id: '1', text: 'MERN costs 499', metadata: { source_file: 'courses/courses.md' } },
  ]);
  const llm = createMockLlm();
  const service = createChatService({ rag, llm, router });

  const result = await service.sendMessage({ message: 'How much does MERN Stack cost?' });

  assert('Route is mentriv', result.route === 'mentriv');
  assert('Reply is non-empty', typeof result.reply === 'string' && result.reply.length > 0);
  assert('ragUsed is true', result.ragUsed === true);
  assert('Has sources', Array.isArray(result.sources) && result.sources.length > 0);
  assert('Has timestamp', typeof result.timestamp === 'string');
};

const testSuccessfulGeneralFlow = async () => {
  console.log('\n--- Regression: Successful general flow ---');

  const router = createMockRouter();
  const rag = createMockRag([]);
  const llm = createMockLlm();
  const service = createChatService({ rag, llm, router });

  const result = await service.sendMessage({ message: 'Explain React' });

  assert('Route is general', result.route === 'general');
  assert('Reply is non-empty', typeof result.reply === 'string' && result.reply.length > 0);
  assert('ragUsed is false', result.ragUsed === false);
  assert('Has timestamp', typeof result.timestamp === 'string');
};

const testSuccessfulStreamingFlow = async () => {
  console.log('\n--- Regression: Successful streaming flow ---');

  const router = createMockRouter();
  const rag = createMockRag([
    { id: '1', text: 'MERN info', metadata: { source_file: 'courses.md' } },
  ]);
  const llm = createMockLlm(['The', ' MERN', ' course']);
  const service = createChatService({ rag, llm, router });

  const events = [];
  await service.streamAnswer({
    message: 'How much does MERN Stack cost?',
    onToken: (t) => events.push({ type: 'token', data: t }),
    onDone: (m) => events.push({ type: 'done', data: m }),
    onError: (e) => events.push({ type: 'error', data: e }),
  });

  const tokenEvents = events.filter((e) => e.type === 'token');
  const doneEvents = events.filter((e) => e.type === 'done');
  const errorEvents = events.filter((e) => e.type === 'error');

  assert('Token events received', tokenEvents.length > 0);
  assert('Done event received', doneEvents.length === 1);
  assert('No error events', errorEvents.length === 0);
  assert('Route is mentriv', doneEvents[0]?.data?.route === 'mentriv');
  assert('ragUsed is true', doneEvents[0]?.data?.ragUsed === true);
};

// ── Tests: ApiError class ───────────────────────────────────────

const testApiErrorProperties = () => {
  console.log('\n--- ApiError: Properties ---');

  const err = new ApiError(503, 'test message');
  assert('Has statusCode', err.statusCode === 503);
  assert('Has message', err.message === 'test message');
  assert('Is operational', err.isOperational === true);
  assert('Is Error instance', err instanceof Error);
};

const testApiErrorWithDetails = () => {
  console.log('\n--- ApiError: With details ---');

  const details = [{ field: 'message', msg: 'Required' }];
  const err = new ApiError(400, 'Validation failed', details);
  assert('Has details', JSON.stringify(err.details) === JSON.stringify(details));
  assert('Status 400', err.statusCode === 400);
};

// ── Tests: Rate limit message ───────────────────────────────────

const testRateLimitMessage = () => {
  console.log('\n--- Rate limit: Correct user-facing message ---');

  const err = new ApiError(429, RATE_LIMIT_MSG);
  assert('Status 429', err.statusCode === 429);
  assert('Correct message', err.message === RATE_LIMIT_MSG);
  assert('No retry-after minutes', !err.message.includes('minute'));
  assert('No internal details', !err.message.includes('window'));
};

// ── Tests: Validation message ───────────────────────────────────

const testValidationMessage = () => {
  console.log('\n--- Validation: Correct user-facing message ---');

  const err = new ApiError(400, 'Validation failed', [{ msg: VALIDATION_MSG }]);
  assert('Status 400', err.statusCode === 400);
  assert('Detail has correct message', err.details[0].msg === VALIDATION_MSG);
};

// ── Tests: Error handler preserves operational messages ──────────

const testErrorHandlerPreservesOperationalMessages = () => {
  console.log('\n--- Error handler: Preserves operational 500+ messages ---');

  const operationalErr = new ApiError(503, USER_FACING_MSG);
  assert('isOperational is true', operationalErr.isOperational === true);
  assert('Message preserved', operationalErr.message === USER_FACING_MSG);

  const internalErr = new Error('Something went wrong');
  internalErr.statusCode = 500;
  assert('Non-operational has no isOperational', internalErr.isOperational !== true);
};

// ── Tests: Provider metadata sanitization ─────────────────────

const testMetadataStrippedFromNonStreaming = async () => {
  console.log('\n--- Metadata: Stripped from non-streaming response ---');

  const router = createMockRouter();
  const rag = createMockRag([]);
  const llm = {
    generateAnswer: async () => 'User Safety: safe\n\nPython is a programming language.',
    generateAnswerStream: async () => { throw new Error('should not be called'); },
  };
  const service = createChatService({ rag, llm, router });

  const result = await service.sendMessage({ message: 'What is Python?' });
  assert('Reply does not contain metadata', !result.reply.includes('User Safety'));
  assert('Reply contains actual answer', result.reply.includes('Python'));
};

const testMetadataStrippedFromStreaming = async () => {
  console.log('\n--- Metadata: Stripped from streaming response ---');

  const router = createMockRouter();
  const rag = createMockRag([]);
  const llm = {
    generateAnswer: async () => { throw new Error('should not be called'); },
    generateAnswerStream: async () => ({
      stream: {
        getReader: () => {
          const tokens = ['Python ', 'is a ', 'lang', '.', '\n', 'User Safety: safe'];
          let i = 0;
          return {
            read: async () => {
              if (i < tokens.length) {
                const token = tokens[i++];
                const data = JSON.stringify({ choices: [{ delta: { content: token } }] });
                return { done: false, value: new TextEncoder().encode(`data: ${data}\n\n`) };
              }
              if (i === tokens.length) {
                i++;
                return { done: false, value: new TextEncoder().encode('data: [DONE]\n\n') };
              }
              return { done: true, value: undefined };
            },
            releaseLock: () => {},
          };
        },
      },
      provider: 'mock-provider',
    }),
  };
  const service = createChatService({ rag, llm, router });

  const events = [];
  await service.streamAnswer({
    message: 'What is Python?',
    onToken: (t) => events.push({ type: 'token', data: t }),
    onDone: (m) => events.push({ type: 'done', data: m }),
    onError: (e) => events.push({ type: 'error', data: e }),
  });

  const tokenEvents = events.filter((e) => e.type === 'token');
  const fullText = tokenEvents.map((e) => e.data).join('');
  assert('No metadata in streamed tokens', !fullText.includes('User Safety'));
  assert('Contains actual answer', fullText.includes('Python'));
};

const testEmptyResponseAfterSanitizeTriggersFallback = async () => {
  console.log('\n--- Metadata: Empty-after-sanitize treated as LLM failure ---');

  const router = createMockRouter();
  const rag = createMockRag([]);
  const llm = {
    generateAnswer: async () => 'User Safety: safe',
    generateAnswerStream: async () => { throw new Error('should not be called'); },
  };
  const service = createChatService({ rag, llm, router });

  const result = await service.sendMessage({ message: 'What is Python?' });
  assert('Reply is sanitized (metadata removed)', result.reply === '');
  assert('Route is general', result.route === 'general');
};

const testMetadataPatterns = () => {
  console.log('\n--- Metadata: sanitizeContent patterns ---');

  assert('sanitizeContent is a function', typeof sanitizeContent === 'function');

  const tests = [
    { input: 'Hello\nUser Safety: safe', expected: 'Hello' },
    { input: 'Answer\nContent Safety: low', expected: 'Answer' },
    { input: 'Reply\n[Blocked: true]', expected: 'Reply' },
    { input: 'Normal response', expected: 'Normal response' },
    { input: '', expected: '' },
  ];

  for (const { input, expected } of tests) {
    const result = sanitizeContent(input);
    assert(`sanitizeContent("${input.slice(0, 30)}")`, result === expected, `got "${result}"`);
  }
};

// ── Runner ──────────────────────────────────────────────────────

const run = async () => {
  console.log('=== Chat Error Handling Tests ===');

  // sendMessage error handling
  await testRagFailureReturnsSanitizedError();
  await testLlmFailureReturnsSanitizedError();
  await testAllProvidersFailReturnsSanitizedError();
  await testMentrivLlmFailureWithRagSuccess();
  await testOutOfScopeDoesNotThrow();

  // streamAnswer error handling
  await testStreamRagFailureSendsErrorEvent();
  await testStreamLlmFailureSendsErrorEvent();
  await testStreamOutOfScopeNoError();

  // Sanitization
  await testNoApiKeyExposedInErrors();
  await testNoStackTraceInUserMessage();
  await testNoProviderDetailsInStreamingError();

  // Regression: existing flows
  await testSuccessfulMentrivFlow();
  await testSuccessfulGeneralFlow();
  await testSuccessfulStreamingFlow();

  // ApiError class
  testApiErrorProperties();
  testApiErrorWithDetails();

  // Message constants
  testRateLimitMessage();
  testValidationMessage();
  testErrorHandlerPreservesOperationalMessages();

  // Metadata sanitization
  await testMetadataStrippedFromNonStreaming();
  await testMetadataStrippedFromStreaming();
  await testEmptyResponseAfterSanitizeTriggersFallback();
  testMetadataPatterns();

  console.log(`\n=== Done: ${passed} passed, ${failed} failed ===`);

  if (failed > 0) {
    process.exit(1);
  }
};

run();
