#!/usr/bin/env node

import { initEmbeddingModel } from '../src/services/embedding.service.js';
import { initQdrant } from '../src/services/vector-db.service.js';
import { retrieveRelevantChunks, DEFAULT_TOP_K, DEFAULT_MIN_RELEVANCE } from '../src/services/rag.service.js';

const testQueries = [
  {
    name: 'Enrollment - short',
    query: 'How do I enroll?',
    expectRelevant: true,
  },
  {
    name: 'Enrollment - full',
    query: 'How do I enroll in a course?',
    expectRelevant: true,
  },
  {
    name: 'Contact - short/terse',
    query: 'how i contact',
    expectRelevant: true,
  },
  {
    name: 'Contact - full',
    query: 'How can I contact support?',
    expectRelevant: true,
  },
  {
    name: 'Courses - how many',
    query: 'how many courses',
    expectRelevant: true,
  },
  {
    name: 'Courses - which courses',
    query: 'What courses does Mentriv offer?',
    expectRelevant: true,
  },
  {
    name: 'Pricing - terse',
    query: 'mernstack price',
    expectRelevant: true,
  },
  {
    name: 'Pricing - full',
    query: 'How much does the MERN Stack course cost?',
    expectRelevant: true,
  },
  {
    name: 'Schedules - short',
    query: 'class timings',
    expectRelevant: true,
  },
  {
    name: 'Schedules - full',
    query: 'What are the class timings?',
    expectRelevant: true,
  },
  {
    name: 'Unrelated - weather (short)',
    query: 'What is the weather today?',
    expectRelevant: false,
  },
  {
    name: 'Unrelated - weather (full)',
    query: 'What is the weather in Tokyo today?',
    expectRelevant: false,
  },
  {
    name: 'Unrelated - pasta recipe',
    query: 'Give me a pasta recipe.',
    expectRelevant: false,
  },
  {
    name: 'Unrelated - pasta carbonara',
    query: 'How do I make pasta carbonara?',
    expectRelevant: false,
  },
];

const printResult = (testName, result, expectRelevant) => {
  const passed = result.hasRelevantContext === expectRelevant;
  const status = passed ? 'PASS' : 'FAIL';

  console.log(`\n[${status}] ${testName}`);
  console.log(`  Query: "${result.query}"`);
  console.log(`  Has relevant context: ${result.hasRelevantContext}`);
  console.log(`  Chunks found: ${result.chunks.length}`);

  if (result.chunks.length > 0) {
    for (const chunk of result.chunks) {
      console.log(`    - [similarity: ${chunk.similarity.toFixed(4)}] ${chunk.text.substring(0, 80)}...`);
      if (chunk.metadata?.source_file) {
        console.log(`      Source: ${chunk.metadata.source_file}`);
      }
    }
  }
};

const runTests = async () => {
  console.log('=== RAG Retrieval Verification ===\n');
  console.log(`Configuration: topK=${DEFAULT_TOP_K}, minRelevance=${DEFAULT_MIN_RELEVANCE}\n`);

  console.log('Initializing embedding model...');
  await initEmbeddingModel();
  console.log('Embedding model ready.\n');

  console.log('Connecting to Qdrant...');
  await initQdrant();
  console.log('Qdrant connected.\n');

  let passed = 0;
  let failed = 0;

  for (const test of testQueries) {
    const result = await retrieveRelevantChunks({
      query: test.query,
      topK: DEFAULT_TOP_K,
      minRelevance: DEFAULT_MIN_RELEVANCE,
    });

    result.query = test.query;

    const testPassed = result.hasRelevantContext === test.expectRelevant;
    if (testPassed) {
      passed++;
    } else {
      failed++;
    }

    printResult(test.name, result, test.expectRelevant);
  }

  console.log('\n=== Summary ===');
  console.log(`Total tests: ${testQueries.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
};

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
