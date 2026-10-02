import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CASE_TIMEOUT_MS = 2000;
const MAX_EXECUTION_DETAILS = 2000;
const MAX_CHECK_DETAIL = 1000;
const MAX_OUTPUT_LENGTH = 8192;
const MAX_REQUIREMENTS = 100;

const REQUIREMENT_TASK_TYPES = ['Frontend Task', 'React Task', 'MERN Task'];

const STOPWORDS = new Set([
  'about', 'above', 'after', 'again', 'also', 'among', 'and', 'any', 'are', 'are', 'been',
  'before', 'being', 'below', 'between', 'both', 'but', 'can', 'contain', 'contains', 'could',
  'each', 'element', 'exist', 'exists', 'expected', 'find', 'found', 'from', 'have', 'having',
  'into', 'include', 'included', 'includes', 'including', 'least', 'less', 'made', 'make',
  'makes', 'missing', 'must', 'need', 'needs', 'only', 'other', 'page', 'pages', 'present',
  'proper', 'properly', 'require', 'required', 'should', 'site', 'than', 'that', 'their',
  'them', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'using', 'used',
  'very', 'want', 'website', 'well', 'were', 'what', 'when', 'where', 'which', 'will',
  'with', 'within', 'without', 'would', 'your', 'section', 'sections',
]);

const truncate = (value, max) => {
  const text = String(value ?? '');
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

const stripComments = (value) =>
  String(value)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')
    .replace(/<!--[\s\S]*?-->/g, '');

const normalizeForPlaceholder = (value) => stripComments(value).replace(/\s+/g, '');

const isPlaceholderOnlyCode = (task, code) => {
  const trimmed = String(code ?? '').trim();
  if (!trimmed) return true;
  const starter = String(task?.starterCode || task?.starterFiles || '');
  if (starter.trim() && normalizeForPlaceholder(trimmed) === normalizeForPlaceholder(starter)) {
    return true;
  }
  return normalizeForPlaceholder(trimmed) === '';
};

const stripRequirementMarkers = (line) => line.replace(/^[-•*\d.)\s]+/, '').trim();

const parseRequirements = (text) =>
  String(text ?? '')
    .split(/\r?\n/)
    .map(stripRequirementMarkers)
    .filter(Boolean)
    .slice(0, MAX_REQUIREMENTS);

const stemWord = (word) => {
  if (word.endsWith('ies') && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith('es') && word.length > 3) return word.slice(0, -2);
  if (word.endsWith('s') && word.length > 3) return word.slice(0, -1);
  return word;
};

const containsKeyword = (lowerCode, word) =>
  lowerCode.includes(word) || lowerCode.includes(stemWord(word));

const evaluateRequirement = (requirement, lowerCode) => {
  const missing = [];

  const tags = [...requirement.matchAll(/<([a-zA-Z][\w-]*)/g)].map((match) =>
    match[1].toLowerCase()
  );
  if (tags.length > 0) {
    tags.forEach((tag) => {
      if (!lowerCode.includes(`<${tag}`)) missing.push(`<${tag}>`);
    });
  } else {
    const quoted = [...requirement.matchAll(/["'`]([^"'`]{2,})["'`]/g)]
      .map((match) => match[1].trim())
      .filter(Boolean);
    if (quoted.length > 0) {
      quoted.forEach((fragment) => {
        if (!lowerCode.includes(fragment.toLowerCase())) missing.push(`"${fragment}"`);
      });
    } else {
      const words = requirement.toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) || [];
      const keywords = [...new Set(words.filter((word) => !STOPWORDS.has(word)))];
      keywords.forEach((word) => {
        if (!containsKeyword(lowerCode, word)) missing.push(word);
      });
    }
  }

  if (missing.length === 0) return { passed: true, detail: '' };
  return { passed: false, detail: truncate(`Not found in your code: ${missing.join(', ')}`, MAX_CHECK_DETAIL) };
};

const evaluateRequirements = (task, code) => {
  const requirements = parseRequirements(task.evaluationRequirements);
  if (requirements.length === 0) return null;

  const lowerCode = code.toLowerCase();
  const checks = requirements.map((requirement) => {
    const { passed, detail } = evaluateRequirement(requirement, lowerCode);
    return { label: requirement, passed, detail };
  });

  const passedCount = checks.filter((check) => check.passed).length;
  const total = checks.length;
  const allPassed = passedCount === total;
  const failedLabels = checks.filter((check) => !check.passed).map((check) => check.label);

  return {
    status: allPassed ? 'accepted' : 'failed',
    score: Math.round((passedCount / total) * 100),
    passedTests: passedCount,
    totalTests: total,
    executionDetails: truncate(
      allPassed
        ? `All ${total} requirements passed.`
        : `${passedCount}/${total} requirements passed. Failed: ${failedLabels.join('; ')}`,
      MAX_EXECUTION_DETAILS
    ),
    checks,
  };
};

const buildRunner = (studentCode) => `const __fs = require('fs');
const __stdout = process.stdout;
const __stderr = process.stderr;
const __stdoutWrite = __stdout.write.bind(__stdout);
console.log = function () {
  try {
    __stderr.write(Array.prototype.map.call(arguments, String).join(' ') + '\\n');
  } catch (err) {}
};
console.info = console.log;
console.warn = console.log;
console.debug = console.log;
require = undefined;
module = undefined;
exports = undefined;
__dirname = undefined;
__filename = undefined;
process.binding = undefined;
process._linkedBinding = undefined;
process.dlopen = undefined;
process.kill = undefined;
process.abort = undefined;
process.mainModule = undefined;
${studentCode}
;(function () {
  const __fn = typeof solve === 'function' ? solve : typeof main === 'function' ? main : null;
  if (!__fn) return;
  const __out = __fn(__fs.readFileSync(0, 'utf8'));
  if (__out !== undefined && __out !== null) {
    __stdoutWrite(typeof __out === 'string' ? __out : JSON.stringify(__out));
  }
})();
`;

const childEnv = () => {
  const env = {};
  if (process.env.SystemRoot) env.SystemRoot = process.env.SystemRoot;
  if (process.env.WINDIR) env.WINDIR = process.env.WINDIR;
  env.TEMP = os.tmpdir();
  env.TMP = os.tmpdir();
  env.TMPDIR = os.tmpdir();
  return env;
};

const runNode = (args, { input = '', timeoutMs = CASE_TIMEOUT_MS } = {}) =>
  new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let settled = false;
    const child = spawn(process.execPath, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      env: childEnv(),
    });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    child.stdout.on('data', (chunk) => {
      if (stdout.length < MAX_OUTPUT_LENGTH) stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      if (stderr.length < MAX_OUTPUT_LENGTH) stderr += chunk.toString();
    });
    child.on('error', (err) => {
      finish({ spawnError: true, stderr: String(err?.message || err) });
    });
    child.on('close', (code, signal) => {
      finish({ code, signal, stdout, stderr, timedOut });
    });
    child.stdin.on('error', () => {});
    try {
      child.stdin.write(input);
      child.stdin.end();
    } catch {
      try {
        child.stdin.end();
      } catch {
        finish({ spawnError: true, stderr: 'Could not start the evaluation process.' });
      }
    }
  });

const cleanErrorOutput = (text, filePath) =>
  truncate(String(text || '').split(filePath).join('your code').trim(), MAX_EXECUTION_DETAILS);

const judgeCodingTask = async (task, code) => {
  const samples = (task.sampleTestCases || []).map((row) => ({
    input: String(row?.input ?? ''),
    expected: String(row?.expected ?? ''),
  }));
  const hidden = (task.hiddenTestCases || []).map((row) => ({
    input: String(row?.input ?? ''),
    expected: String(row?.expected ?? ''),
  }));
  const total = samples.length + hidden.length;
  if (total === 0) return null;

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mentriv-judge-'));
  try {
    const studentFile = path.join(tmpDir, 'student.js');
    await fs.writeFile(studentFile, code, 'utf8');

    const syntax = await runNode(['--check', studentFile]);
    if (syntax.spawnError || syntax.timedOut) return null;
    if (syntax.code !== 0) {
      return {
        status: 'compilation_error',
        score: 0,
        passedTests: 0,
        totalTests: total,
        executionDetails: cleanErrorOutput(syntax.stderr || syntax.stdout, studentFile),
        checks: samples.map((row, index) => ({
          label: `Test Case ${index + 1}`,
          passed: false,
          detail: 'Code did not compile.',
        })),
      };
    }

    const runnerFile = path.join(tmpDir, 'runner.js');
    await fs.writeFile(runnerFile, buildRunner(code), 'utf8');

    const caseDefs = [
      ...samples.map((row, index) => ({ ...row, visible: true, label: `Test Case ${index + 1}` })),
      ...hidden.map((row) => ({ ...row, visible: false, label: '' })),
    ];

    const results = await Promise.all(
      caseDefs.map(async (row) => {
        const result = await runNode([runnerFile], { input: row.input });
        if (result.spawnError) return { row, outcome: 'spawn_error', detail: '' };
        if (result.timedOut) {
          return { row, outcome: 'timeout', detail: `Time limit exceeded (${CASE_TIMEOUT_MS / 1000}s).` };
        }
        if (result.code !== 0) {
          return {
            row,
            outcome: 'runtime_error',
            detail: truncate(
              row.visible
                ? result.stderr.trim() || 'Runtime error while running this test case.'
                : 'Runtime error on a hidden test case.',
              MAX_CHECK_DETAIL
            ),
          };
        }
        const actual = result.stdout.trim();
        const expected = row.expected.trim();
        if (actual === expected) return { row, outcome: 'passed', detail: '' };
        return {
          row,
          outcome: 'failed',
          detail: truncate(
            `Expected: ${expected || '(empty)'}\nReceived: ${actual || '(empty)'}`,
            MAX_CHECK_DETAIL
          ),
        };
      })
    );

    if (results.some((result) => result.outcome === 'spawn_error')) return null;

    const passedCount = results.filter((result) => result.outcome === 'passed').length;
    const anyTimeout = results.some((result) => result.outcome === 'timeout');
    const anyRuntimeError = results.some((result) => result.outcome === 'runtime_error');
    const status = anyTimeout
      ? 'time_limit_exceeded'
      : anyRuntimeError
        ? 'runtime_error'
        : passedCount === total
          ? 'accepted'
          : 'wrong_answer';

    const checks = results
      .filter((result) => result.row.visible)
      .map((result) => ({
        label: result.row.label,
        passed: result.outcome === 'passed',
        detail: result.outcome === 'passed' ? '' : result.detail,
      }));

    const detailLines = [];
    if (status === 'accepted') {
      detailLines.push(`All ${total} test cases passed.`);
    } else {
      const hiddenFailed = results.filter(
        (result) => !result.row.visible && result.outcome !== 'passed'
      );
      if (hiddenFailed.length > 0) {
        detailLines.push(`${hiddenFailed.length} hidden test case(s) failed.`);
      }
      results
        .filter((result) => result.row.visible && result.outcome !== 'passed')
        .forEach((result) => {
          detailLines.push(`${result.row.label}: ${result.detail}`);
        });
    }

    return {
      status,
      score: Math.round((passedCount / total) * 100),
      passedTests: passedCount,
      totalTests: total,
      executionDetails: truncate(detailLines.join('\n'), MAX_EXECUTION_DETAILS),
      checks,
    };
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true, maxRetries: 3 }).catch(() => {});
  }
};

const isJavaScriptTask = (task) => /javascript/i.test(String(task.language || ''));

const evaluateCodingSubmission = async (task, code) => {
  try {
    if (task.taskType === 'Coding Problem') {
      if (!isJavaScriptTask(task)) return null;
      return await judgeCodingTask(task, code);
    }
    if (REQUIREMENT_TASK_TYPES.includes(task.taskType)) {
      return evaluateRequirements(task, code);
    }
    return null;
  } catch {
    return null;
  }
};

export { isPlaceholderOnlyCode, evaluateCodingSubmission };
