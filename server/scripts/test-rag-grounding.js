#!/usr/bin/env node

// Live RAG grounding regression test.
// Exercises the real chatbot generation path (default chatService with live RAG + LLM).
// Verifies:
//   C. Answers use retrieved facts (price, contact details, timings).
//   D. No fabricated phone numbers / emails / prices when the fact is absent.
//   E. Identical factual questions are factually consistent across runs.
//
// Requires configured environment keys (Gemini embedding, Qdrant, and at least one LLM provider).
// Requires the Qdrant collection to be populated (run: node scripts/ingest-knowledge.js).

import chatService from '../src/services/chat.service.js';

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

const KB_PHONE = '9550441728';
const KB_EMAIL = 'maheswarreddygondireddy12@gmail.com';

const findFabricatedPhones = (text) => {
  const matches = text.match(/\b\d{10}\b/g) || [];
  return matches.filter((num) => num !== KB_PHONE);
};

const findFabricatedEmails = (text) => {
  const matches = text.match(/\b[\w.+-]+@[\w-]+\.[\w.]+\b/g) || [];
  return matches.filter((email) => email !== KB_EMAIL);
};

const findRupeePrices = (text) => (text.match(/₹\s?\d[\d,]*(?:\.\d+)?/g) || []);

const NOT_AVAILABLE_PHRASES = [
  'not available',
  'not listed',
  'not documented',
  'not mentioned',
  'no information',
  'not found in the knowledge base',
  'don\u2019t have',
  "don't have",
  'do not have',
  'cannot find',
  "can't find",
  'not provided',
];

const hasNotAvailablePhrase = (text) => {
  const lower = text.toLowerCase();
  return NOT_AVAILABLE_PHRASES.some((p) => lower.includes(p));
};

const run = async () => {
  console.log('=== RAG Grounding + No-Fabrication + Consistency Tests ===');
  console.log('Uses the live chatbot generation path (real RAG + real LLM).\n');

  // C. Factual grounding — answers must contain the facts present in the Knowledge base.
  const groundingCases = [
    {
      label: 'MERN price is grounded',
      question: 'How much does the MERN Stack course cost?',
      required: ['₹499'],
    },
    {
      label: 'Support contact is grounded (phone + email)',
      question: 'How can I contact support?',
      required: [KB_PHONE, KB_EMAIL],
    },
    {
      label: 'Class timings are grounded',
      question: 'What are the class timings?',
      required: ['6:00 PM'],
    },
    {
      label: 'Enrollment answer stays grounded (no invented contact details)',
      question: 'How do I enroll in a course?',
      required: ['approval', 'pending', 'admin', 'register', 'enrollment'],
    },
  ];

  for (const c of groundingCases) {
    console.log(`\n--- ${c.label} ---`);
    try {
      const result = await chatService.sendMessage({ message: c.question });
      assert('Route is mentriv', result.route === 'mentriv', `route=${result.route}`);
      assert('RAG was used', result.ragUsed === true);
      assert('Reply is non-empty', typeof result.reply === 'string' && result.reply.length > 0);
      assert('Reply is grounded on required facts', c.required.some((f) => result.reply.includes(f)), `reply="${result.reply.slice(0, 220)}"`);
      assert('No fabricated phone number', findFabricatedPhones(result.reply).length === 0, findFabricatedPhones(result.reply).join(', '));
      assert('No fabricated email', findFabricatedEmails(result.reply).length === 0, findFabricatedEmails(result.reply).join(', '));
    } catch (error) {
      assert('Chat completed without error', false, error.message);
    }
  }

  // D. No fabrication when the requested fact is absent from the Knowledge base.
  console.log('\n--- Fact absent from KB → grounded "not available", no fabrication ---');
  try {
    const result = await chatService.sendMessage({
      message: "How much does Mentriv's Android development course cost?",
    });
    const fabricatedPhones = findFabricatedPhones(result.reply);
    const fabricatedEmails = findFabricatedEmails(result.reply);
    const fabricatedPrices = findRupeePrices(result.reply);
    assert('Route is mentriv', result.route === 'mentriv', `route=${result.route}`);
    assert('RAG was used', result.ragUsed === true);
    assert('No fabricated phone number', fabricatedPhones.length === 0, fabricatedPhones.join(', '));
    assert('No fabricated email', fabricatedEmails.length === 0, fabricatedEmails.join(', '));
    assert('No invented price', fabricatedPrices.length === 0, fabricatedPrices.join(', '));
    assert('Grounded "not available" response', hasNotAvailablePhrase(result.reply), `reply="${result.reply.slice(0, 220)}"`);
  } catch (error) {
    assert('Chat completed without error', false, error.message);
  }

  // E. Consistency — identical factual question must stay factually consistent across runs.
  console.log('\n--- Consistency: MERN price asked twice ---');
  const replies = [];
  for (let i = 0; i < 2; i++) {
    try {
      const result = await chatService.sendMessage({
        message: 'How much does the MERN Stack course cost?',
      });
      replies.push(result.reply);
      assert(`Run ${i + 1} route is mentriv`, result.route === 'mentriv', `route=${result.route}`);
      assert(`Run ${i + 1} RAG was used`, result.ragUsed === true);
      assert(`Run ${i + 1} contains the correct price`, result.reply.includes('₹499'), `reply="${result.reply.slice(0, 220)}"`);
      assert(`Run ${i + 1} no fabricated phone/email`, findFabricatedPhones(result.reply).length === 0 && findFabricatedEmails(result.reply).length === 0);
    } catch (error) {
      assert(`Run ${i + 1} chat completed without error`, false, error.message);
    }
  }
  if (replies.length === 2) {
    const similar = replies[0].trim().toLowerCase() === replies[1].trim().toLowerCase()
      || replies[0].toLowerCase().includes(replies[1].slice(0, 40).toLowerCase())
      || replies[1].toLowerCase().includes(replies[0].slice(0, 40).toLowerCase());
    assert('Materially consistent across runs', similar);
    console.log(`    Run1: ${replies[0].slice(0, 160)}`);
    console.log(`    Run2: ${replies[1].slice(0, 160)}`);
  }

  console.log(`\n=== Done: ${passed} passed, ${failed} failed ===`);

  if (failed > 0) {
    process.exit(1);
  }
};

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});