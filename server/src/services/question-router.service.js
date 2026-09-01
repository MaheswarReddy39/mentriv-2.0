const MENTRIV_KEYWORDS = [
  'mentriv',
  'course',
  'courses',
  'class',
  'classes',
  'enrollment',
  'enroll',
  'register',
  'registration',
  'payment',
  'mentor',
  'mentorship',
  'assignment',
  'submission',
  'mcq',
  'test',
  'assessment',
  'progress',
  'curriculum',
  'student',
  'teacher',
  'admin',
  'announcement',
  'notification',
  'mern',
  'certificate',
  'syllabus',
  'schedule',
  'fee',
  'fees',
  'refund',
  'policy',
  'policies',
  'support',
  'contact',
  'help',
  'dashboard',
  'account',
  'login',
  'signup',
  'batch',
  'lesson',
  'project',
];

const EDUCATIONAL_KEYWORDS = [
  'linked list',
  'binary tree',
  'hash map',
  'hash table',
  'array',
  'queue',
  'stack',
  'tree',
  'graph',
  'algorithm',
  'data structure',
  'programming',
  'code',
  'function',
  'variable',
  'object',
  'string',
  'loop',
  'recursion',
  'inheritance',
  'polymorphism',
  'database',
  'sql',
  'nosql',
  'mongodb',
  'api',
  'http',
  'tcp',
  'ip',
  'dns',
  'server',
  'client',
  'network',
  'protocol',
  'react',
  'javascript',
  'python',
  'java',
  'c++',
  'html',
  'css',
  'node',
  'npm',
  'git',
  'docker',
  'kubernetes',
  'linux',
  'windows',
  'machine learning',
  'deep learning',
  'neural network',
  'ai',
  'artificial intelligence',
  'data science',
  'statistics',
  'math',
  'algebra',
  'calculus',
  'physics',
  'chemistry',
  'biology',
  'science',
  'technology',
  'engineering',
  'computer',
  'software',
  'hardware',
  'binary',
  'pixel',
  'compiler',
  'interpreter',
  'operating system',
  'cloud',
  'aws',
  'azure',
  'security',
  'encryption',
  'authentication',
  'frontend',
  'backend',
  'fullstack',
  'framework',
  'library',
  'package',
  'module',
  'dependency',
  'testing',
  'debug',
  'error',
  'exception',
  'syntax',
  'paradigm',
  'pattern',
  'architecture',
  'microservices',
  'rest',
  'graphql',
  'websocket',
  'json',
  'xml',
  'yaml',
  'regex',
  'hash',
  'sort',
  'search',
  'complexity',
  'time complexity',
  'space complexity',
];

const GREETING_WORDS = ['hi', 'hello', 'hey', 'hii', 'hiii', 'hlo', 'yo', 'howdy', 'greetings'];

const normalize = (text) => text.toLowerCase().trim();

const hasKeyword = (text, keywords) =>
  keywords.some((kw) => {
    if (kw.includes(' ')) return text.includes(kw);
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}`).test(text);
  });

const hasMentrivKeyword = (question) => {
  const lower = normalize(question);
  return hasKeyword(lower, MENTRIV_KEYWORDS);
};

const hasEducationalKeyword = (question) => {
  const lower = normalize(question);
  return hasKeyword(lower, EDUCATIONAL_KEYWORDS);
};

const isGreeting = (question) => {
  const lower = normalize(question);
  return GREETING_WORDS.some((g) => lower === g || lower === `${g}!` || lower === `${g}.`);
};

const GREETING_RESPONSE =
  "Hello! I'm Mentriv AI, here to help with questions about our courses, enrollment, mentorship, and platform. What would you like to know?";

const OUT_OF_SCOPE_RESPONSE =
  "I'm here to help with questions about Mentriv — our courses, enrollment, mentorship, and platform. Please ask something related to Mentriv.";

const routeQuestion = (question) => {
  if (!question || typeof question !== 'string') {
    return { route: 'out_of_scope', useRag: false, useLlm: false };
  }

  if (isGreeting(question)) {
    return { route: 'greeting', useRag: false, useLlm: false };
  }

  if (hasMentrivKeyword(question)) {
    return { route: 'mentriv', useRag: true, useLlm: true };
  }

  if (hasEducationalKeyword(question)) {
    return { route: 'general', useRag: false, useLlm: true };
  }

  return { route: 'out_of_scope', useRag: false, useLlm: false };
};

export {
  routeQuestion,
  OUT_OF_SCOPE_RESPONSE,
  GREETING_RESPONSE,
  MENTRIV_KEYWORDS,
  EDUCATIONAL_KEYWORDS,
  GREETING_WORDS,
};
