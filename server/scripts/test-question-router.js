import { routeQuestion, OUT_OF_SCOPE_RESPONSE, MENTRIV_KEYWORDS, EDUCATIONAL_KEYWORDS } from '../src/services/question-router.service.js';

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

const testMentrivRouting = () => {
  console.log('\n--- Route: Mentriv-specific (RAG + LLM) ---');

  const cases = [
    'What courses does Mentriv offer?',
    'How much does the MERN Stack course cost?',
    'How do I enroll in a course?',
    'What is the class schedule?',
    'Tell me about mentorship',
    'How do I submit an assignment?',
    'What are the fees?',
    'How does the MCQ test work?',
    'What is Mentriv?',
    'When is the next batch starting?',
    'How do I contact support?',
    'What is the refund policy?',
    'How much is Mentriv MERN course?',
    'What are Mentriv class timings?',
  ];

  for (const q of cases) {
    const r = routeQuestion(q);
    assert(
      `"${q}" → mentriv`,
      r.route === 'mentriv' && r.useRag === true && r.useLlm === true,
      `route=${r.route}, useRag=${r.useRag}, useLlm=${r.useLlm}`,
    );
  }
};

const testGeneralRouting = () => {
  console.log('\n--- Route: General educational (LLM only, no RAG) ---');

  const cases = [
    'What is a linked list?',
    'Explain quantum computing',
    'How does TCP/IP work?',
    'What is machine learning?',
    'Tell me about Python decorators',
    'How do databases index data?',
    'What is React?',
    'Explain Python decorators',
    'How does the internet work?',
    'What is a neural network?',
    'Compare SQL and NoSQL',
    'What is the difference between stack and queue?',
    'How do I learn programming?',
    'What is Docker used for?',
    'Explain recursion',
  ];

  for (const q of cases) {
    const r = routeQuestion(q);
    assert(
      `"${q}" → general`,
      r.route === 'general' && r.useRag === false && r.useLlm === true,
      `route=${r.route}, useRag=${r.useRag}, useLlm=${r.useLlm}`,
    );
  }
};

const testOutOfScopeRouting = () => {
  console.log('\n--- Route: Out of scope (no RAG, no LLM) ---');

  const cases = [
    '',
    null,
    undefined,
    'Who won yesterday\'s cricket match?',
    'Write me a birthday poem',
    'What is the weather today?',
    'I love cats',
    'The weather is nice today',
    '42',
    'Tell me a joke',
    'What time is it?',
    'How was your day?',
    'I am bored',
  ];

  for (const q of cases) {
    const r = routeQuestion(q);
    assert(
      `routeQuestion(${JSON.stringify(q)}) → out_of_scope`,
      r.route === 'out_of_scope' && r.useRag === false && r.useLlm === false,
      `route=${r.route}, useRag=${r.useRag}, useLlm=${r.useLlm}`,
    );
  }
};

const testOutOfScopeConstant = () => {
  console.log('\n--- Out-of-scope response constant ---');
  assert('Response is a non-empty string', typeof OUT_OF_SCOPE_RESPONSE === 'string' && OUT_OF_SCOPE_RESPONSE.length > 0);
  assert('No provider/key references', !OUT_OF_SCOPE_RESPONSE.toLowerCase().includes('openrouter'));
  assert('No API key references', !OUT_OF_SCOPE_RESPONSE.includes('key'));
};

const testKeywordsAreLowercase = () => {
  console.log('\n--- Keyword list integrity ---');
  const mentrivAllLower = MENTRIV_KEYWORDS.every((kw) => kw === kw.toLowerCase());
  const eduAllLower = EDUCATIONAL_KEYWORDS.every((kw) => kw === kw.toLowerCase());
  assert('All Mentriv keywords are lowercase', mentrivAllLower);
  assert('All educational keywords are lowercase', eduAllLower);
  assert('Mentriv keyword list is non-empty', MENTRIV_KEYWORDS.length > 0, `${MENTRIV_KEYWORDS.length} keywords`);
  assert('Educational keyword list is non-empty', EDUCATIONAL_KEYWORDS.length > 0, `${EDUCATIONAL_KEYWORDS.length} keywords`);
};

const testEdgeCases = () => {
  console.log('\n--- Edge cases ---');

  const r1 = routeQuestion('MENTRIV COURSE');
  assert('Case-insensitive Mentriv matching', r1.route === 'mentriv', `route=${r1.route}`);

  const r2 = routeQuestion('  What is Mentriv?  ');
  assert('Handles leading/trailing whitespace', r2.route === 'mentriv', `route=${r2.route}`);

  const r3 = routeQuestion('WHAT IS REACT');
  assert('Case-insensitive educational matching', r3.route === 'general', `route=${r3.route}`);

  const r4 = routeQuestion('  Explain Python  ');
  assert('Handles whitespace in general questions', r4.route === 'general', `route=${r4.route}`);
};

const run = () => {
  console.log('=== Question Router Tests ===');
  testMentrivRouting();
  testGeneralRouting();
  testOutOfScopeRouting();
  testOutOfScopeConstant();
  testKeywordsAreLowercase();
  testEdgeCases();
  console.log(`\n=== Done: ${passed} passed, ${failed} failed ===`);

  if (failed > 0) {
    process.exit(1);
  }
};

run();
