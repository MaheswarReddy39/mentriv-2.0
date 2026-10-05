// Levels are never hardcoded: they come from the backend groups response.
export const CODING_LEVEL_BADGE_CLASS = {
  Beginner: 'badge-success',
  Intermediate: 'badge-warning',
  Advanced: 'badge-danger',
};

export const CODING_DIFFICULTY_BADGE_CLASS = {
  Easy: 'badge-success',
  Medium: 'badge-warning',
  Hard: 'badge-danger',
};

export const STUDENT_STATUS_LABEL = {
  not_started: 'Not Started',
  attempted: 'Attempted',
  solved: 'Solved',
};

export const TASK_STATUS_BADGE_CLASS = {
  Solved: 'badge-success',
  Attempted: 'badge-warning',
  'Not Started': 'badge-neutral',
};

export const TASK_ACTION_LABEL = {
  Solved: 'View',
  Attempted: 'Continue',
  'Not Started': 'Solve',
};

export const SUBMISSION_STATUS_LABEL = {
  submitted: 'Submitted',
  accepted: 'Accepted',
  failed: 'Failed',
  wrong_answer: 'Wrong Answer',
  runtime_error: 'Runtime Error',
  time_limit_exceeded: 'Time Limit Exceeded',
  compilation_error: 'Compilation Error',
};

export const JUDGED_SUBMISSION_STATUSES = [
  'accepted',
  'failed',
  'wrong_answer',
  'runtime_error',
  'time_limit_exceeded',
  'compilation_error',
];

export const RUN_BUTTON_LABEL = {
  coding: 'Run Code',
  frontend: 'Run Preview',
  backend: 'Run Tests',
  mern: 'Run',
};

export const EDITOR_LABEL = {
  coding: 'Code editor',
  frontend: 'HTML / CSS editor',
  backend: 'Code / project area',
  mern: 'Project / code area',
};

export const OUTPUT_TITLE = {
  coding: 'Test cases / results',
  frontend: 'Live preview',
  backend: 'API testing area',
  mern: 'Preview / results area',
};

export const OUTPUT_PLACEHOLDER = {
  coding: 'Submit your code to run the test cases. Results appear in the result panel below.',
  frontend: 'Run Preview to render your page here. Evaluation results appear below after you submit.',
  backend: 'Evaluation results appear in the result panel below after you submit.',
  mern: 'Evaluation results appear in the result panel below after you submit.',
};

export const SUBMIT_EMPTY_MESSAGE = 'Please write your code before submitting.';

export const RUN_EMPTY_MESSAGE = 'Please write some code before running the preview.';

export const workspaceVariant = (taskType) => {
  if (taskType === 'Coding Problem') return 'coding';
  if (taskType === 'Frontend Task' || taskType === 'React Task') return 'frontend';
  if (taskType === 'Backend / API Task') return 'backend';
  return 'mern';
};

const MONACO_LANGUAGE_BY_NAME = {
  javascript: 'javascript',
  typescript: 'typescript',
  python: 'python',
  java: 'java',
  'c++': 'cpp',
  cpp: 'cpp',
  go: 'go',
  html: 'html',
  css: 'css',
};

export const resolveEditorLanguage = (task) => {
  if (!task) return 'plaintext';
  if (workspaceVariant(task.taskType) === 'frontend') return 'html';
  const key = String(task.language || '').trim().toLowerCase();
  return MONACO_LANGUAGE_BY_NAME[key] || 'plaintext';
};

export const submissionBadgeStatus = (status) => {
  if (status === 'accepted') return 'passed';
  if (status === 'time_limit_exceeded') return 'pending';
  if (
    status === 'wrong_answer' ||
    status === 'runtime_error' ||
    status === 'failed' ||
    status === 'compilation_error'
  ) {
    return 'failed';
  }
  if (status === 'submitted') return 'submitted';
  return 'neutral';
};

export const submissionBorderColor = (status) => {
  if (status === 'accepted') return 'var(--teal)';
  if (status === 'time_limit_exceeded') return 'var(--amber)';
  if (
    status === 'wrong_answer' ||
    status === 'runtime_error' ||
    status === 'failed' ||
    status === 'compilation_error'
  ) {
    return 'var(--coral-dark)';
  }
  return 'var(--border)';
};

export const submissionStatusLabel = (status) =>
  SUBMISSION_STATUS_LABEL[status] || String(status || '').replace(/_/g, ' ');

export const requirementsBullets = (task) => {
  const source =
    task.taskType === 'Backend / API Task'
      ? task.apiRequirements
      : task.taskType === 'MERN Task'
        ? [task.frontendRequirements, task.backendRequirements, task.databaseRequirements]
            .filter((part) => String(part || '').trim())
            .join('\n')
        : task.requirements;

  return String(source || '')
    .split('\n')
    .map((line) => line.replace(/^[-•*\d.)\s]+/, '').trim())
    .filter(Boolean);
};

export const examplesForTask = (task) => {
  if (task.taskType === 'Coding Problem') {
    return (task.sampleTestCases || [])
      .filter((testCase) => String(testCase.input || '').trim() || String(testCase.expected || '').trim())
      .map((testCase) => ({
        input: testCase.input,
        output: testCase.expected,
        note: '',
      }));
  }
  if (task.taskType === 'Backend / API Task') {
    return (task.apiTestCases || [])
      .filter((testCase) => String(testCase.endpoint || '').trim())
      .map((testCase) => ({
        input: `${testCase.method} ${testCase.endpoint}`,
        output: testCase.expected,
        note: '',
      }));
  }
  return [];
};

export const constraintsList = (task) =>
  String(task.constraints || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

export const formatDateTime = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

export const topicSearchUrl = (task, courseId) => {
  const params = new URLSearchParams({
    courseId: courseId || task.courseIds?.[0] || '',
    level: task.level,
    topic: task.topic,
  });
  return `/coding-practice/topic?${params.toString()}`;
};

// Picks the course context used for a task navigation/submission:
// prefers `preferredCourseId` when the student reaches the task through it,
// otherwise the first of the task's courses the student is enrolled in.
// Returns '' when nothing is known — the backend then resolves the
// accessible course server-side.
export const resolveAccessibleCourseId = (task, preferredCourseId, enrolledCourseIds = []) => {
  const taskIds = (task?.courseIds || []).map(String);
  const preferred = preferredCourseId ? String(preferredCourseId) : '';
  const enrolled = new Set((enrolledCourseIds || []).map(String));
  const accessible = taskIds.filter((id) => enrolled.has(id));

  if (accessible.length > 0) {
    return preferred && accessible.includes(preferred) ? preferred : accessible[0];
  }
  return preferred && taskIds.includes(preferred) ? preferred : '';
};

const stripComments = (value) =>
  String(value)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')
    .replace(/<!--[\s\S]*?-->/g, '');

const normalizeForPlaceholder = (value) => stripComments(value).replace(/\s+/g, '');

export const isPlaceholderCode = (task, rawCode) => {
  const trimmed = String(rawCode || '').trim();
  if (!trimmed) return true;
  const starter = String(task?.starterCode || task?.starterFiles || '');
  if (starter.trim() && normalizeForPlaceholder(trimmed) === normalizeForPlaceholder(starter)) {
    return true;
  }
  return normalizeForPlaceholder(trimmed) === '';
};

export const checksKind = (task) =>
  task?.taskType === 'Coding Problem' ? 'test_cases' : 'requirements';

export const formatCheckLabel = (check, kind) => {
  const label = String(check?.label || '');
  if (kind === 'test_cases') return label;
  const base = label.replace(/\s+(found|missing|present|exists)$/i, '').trim() || label;
  return `${base} ${check?.passed ? 'found' : 'missing'}`;
};
