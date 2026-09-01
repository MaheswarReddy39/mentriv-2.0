import env from '../src/config/env.js';
import llmService from '../src/services/llm.service.js';

const log = (label, passed, detail = '') => {
  const icon = passed ? 'PASS' : 'FAIL';
  console.log(`[${icon}] ${label}${detail ? ` — ${detail}` : ''}`);
};

const testProviderStatus = () => {
  console.log('\n--- Provider Status ---');
  const status = llmService.getProviderStatus();
  status.forEach((p) => console.log(`  ${p.name}: ${p.available ? 'configured' : 'skipped (no key)'}`));
  return status;
};

const testMissingAllKeys = async () => {
  console.log('\n--- Test: All providers unavailable ---');
  const origKeys = {
    openrouter: env.openrouterApiKey,
    groq: env.groqApiKey,
    gemini: env.geminiApiKey,
  };

  env.openrouterApiKey = '';
  env.groqApiKey = '';
  env.geminiApiKey = '';

  try {
    await llmService.generateAnswer({ question: 'test' });
    log('Throws when no providers configured', false, 'no error thrown');
  } catch (err) {
    const correctMessage = err.message === 'No LLM providers are configured';
    const noKeysExposed = !JSON.stringify(err).includes('key');
    log('Throws when no providers configured', correctMessage, err.message);
    log('No API keys exposed in error', noKeysExposed);
  } finally {
    env.openrouterApiKey = origKeys.openrouter;
    env.groqApiKey = origKeys.groq;
    env.geminiApiKey = origKeys.gemini;
  }
};

const testEmptyQuestion = async () => {
  console.log('\n--- Test: Empty question validation ---');
  try {
    await llmService.generateAnswer({ question: '' });
    log('Rejects empty question', false, 'no error thrown');
  } catch (err) {
    log('Rejects empty question', err.statusCode === 400, err.message);
  }
};

const testPrimaryFirst = async () => {
  console.log('\n--- Test: Primary provider attempted first ---');

  const callOrder = [];
  const origProviders = [];

  const { default: origEnv } = await import('../src/config/env.js');
  origProviders.push(
    { key: 'openrouterApiKey', val: origEnv.openrouterApiKey },
    { key: 'groqApiKey', val: origEnv.groqApiKey },
    { key: 'geminiApiKey', val: origEnv.geminiApiKey },
  );

  origEnv.openrouterApiKey = 'test-openrouter-key';
  origEnv.groqApiKey = 'test-groq-key';
  origEnv.geminiApiKey = '';

  const origFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (url.includes('openrouter.ai')) {
      callOrder.push('openrouter');
      throw new Error('Simulated OpenRouter failure');
    }
    if (url.includes('groq.com')) {
      callOrder.push('groq');
      throw new Error('Simulated Groq failure');
    }
    return origFetch(url, opts);
  };

  try {
    await llmService.generateAnswer({ question: 'test' });
    log('Primary attempted first', false, 'no error');
  } catch {
    log('Primary attempted first', callOrder[0] === 'openrouter', `call order: ${callOrder.join(' -> ')}`);
    log('Fallback to Groq on failure', callOrder[1] === 'groq', `call order: ${callOrder.join(' -> ')}`);
  } finally {
    globalThis.fetch = origFetch;
    origEnv.openrouterApiKey = origProviders[0].val;
    origEnv.groqApiKey = origProviders[1].val;
    origEnv.geminiApiKey = origProviders[2].val;
  }
};

const testAllFailProducesSingleError = async () => {
  console.log('\n--- Test: All providers fail → single sanitized error ---');

  const origFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error('Simulated failure');
  };

  const origKeys = {
    openrouter: env.openrouterApiKey,
    groq: env.groqApiKey,
    gemini: env.geminiApiKey,
  };
  env.openrouterApiKey = 'test';
  env.groqApiKey = 'test';
  env.geminiApiKey = 'test';

  try {
    await llmService.generateAnswer({ question: 'test' });
    log('Throws on all-provider failure', false, 'no error');
  } catch (err) {
    const isSanitized = err.message === 'LLM service temporarily unavailable';
    const noKeys = !JSON.stringify(err).includes('test-');
    const noStack = !JSON.stringify(err).includes('fetch');
    log('Single sanitized error', isSanitized, err.message);
    log('No API keys in error', noKeys);
    log('No stack/HTTP details in error', noStack);
  } finally {
    globalThis.fetch = origFetch;
    env.openrouterApiKey = origKeys.openrouter;
    env.groqApiKey = origKeys.groq;
    env.geminiApiKey = origKeys.gemini;
  }
};

const testSkipsUnavailable = async () => {
  console.log('\n--- Test: Missing key → provider skipped ---');

  const callOrder = [];
  const origFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (url.includes('openrouter.ai')) callOrder.push('openrouter');
    if (url.includes('groq.com')) callOrder.push('groq');
    if (url.includes('generativelanguage.googleapis.com')) callOrder.push('gemini');
    throw new Error('Simulated failure');
  };

  const origKeys = {
    openrouter: env.openrouterApiKey,
    groq: env.groqApiKey,
    gemini: env.geminiApiKey,
  };
  env.openrouterApiKey = '';
  env.groqApiKey = 'test';
  env.geminiApiKey = 'test';

  try {
    await llmService.generateAnswer({ question: 'test' });
    log('Skips unavailable provider', false, 'no error');
  } catch {
    const skippedOpenrouter = !callOrder.includes('openrouter');
    log('Skips OpenRouter (no key)', skippedOpenrouter, `called: ${callOrder.join(', ')}`);
    log('Tries Groq second', callOrder[0] === 'groq', `called: ${callOrder.join(', ')}`);
  } finally {
    globalThis.fetch = origFetch;
    env.openrouterApiKey = origKeys.openrouter;
    env.groqApiKey = origKeys.groq;
    env.geminiApiKey = origKeys.gemini;
  }
};

const run = async () => {
  console.log('=== LLM Fallback Router Tests ===');
  testProviderStatus();
  await testMissingAllKeys();
  await testEmptyQuestion();
  await testPrimaryFirst();
  await testAllFailProducesSingleError();
  await testSkipsUnavailable();
  console.log('\n=== Done ===');
};

run().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
