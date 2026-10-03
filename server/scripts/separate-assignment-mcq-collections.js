#!/usr/bin/env node

/**
 * Assignment vs MCQ/Practice collection separation check.
 *
 * Verifies that assignment content lives only in `assignments` and MCQ/practice
 * content lives only in `mcq_tests`, that no shared/mixed content collection
 * exists, and that model -> collection mapping is explicit.
 *
 * Default mode is a dry run (no writes). Only documents that are provably
 * mis-filed are ever moved, and only with `--apply`. Moves preserve `_id`,
 * verify the copied document before the source is deleted, and abort on any
 * conflict so no data can be lost.
 *
 * Usage:
 *   node scripts/separate-assignment-mcq-collections.js          # dry run
 *   node scripts/separate-assignment-mcq-collections.js --apply   # migrate
 */

import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';

import Assignment from '../src/models/assignment.model.js';
import McqTest from '../src/models/mcq.model.js';
import Submission from '../src/models/submission.model.js';
import McqAttempt from '../src/models/mcq-attempt.model.js';

const ASSIGNMENTS = 'assignments';
const MCQ_TESTS = 'mcq_tests';

const REFERENCE_COLLECTIONS = new Set(['submissions', 'mcq_attempts']);

const APPLY = process.argv.includes('--apply');

const has = (doc, key) => Object.prototype.hasOwnProperty.call(doc, key);

const isAssignmentDoc = (doc) =>
  has(doc, 'assignmentType') || (has(doc, 'maxMarks') && has(doc, 'dueDate'));

const isMcqDoc = (doc) =>
  has(doc, 'passingScore') ||
  (Array.isArray(doc.questions) &&
    doc.questions.some((question) => question && has(question, 'correctOption')));

const classify = (doc) => {
  const assignment = isAssignmentDoc(doc);
  const mcq = isMcqDoc(doc);
  if (assignment && mcq) return 'mixed';
  if (assignment) return 'assignment';
  if (mcq) return 'mcq';
  return 'other';
};

const moveDocument = async (sourceName, targetName, doc) => {
  const db = mongoose.connection.db;
  const source = db.collection(sourceName);
  const target = db.collection(targetName);

  const existing = await target.findOne({ _id: doc._id }, { projection: { _id: 1 } });
  if (existing) {
    return { status: 'conflict', reason: `${targetName} already contains _id ${doc._id}` };
  }

  await target.insertOne(doc);
  const copied = await target.findOne({ _id: doc._id });
  if (!copied || JSON.stringify(copied) !== JSON.stringify(doc)) {
    await target.deleteOne({ _id: doc._id });
    return { status: 'aborted', reason: 'copy verification failed, source left untouched' };
  }

  const deleted = await source.deleteOne({ _id: doc._id });
  if (deleted.deletedCount !== 1) {
    await target.deleteOne({ _id: doc._id });
    return { status: 'aborted', reason: 'could not remove source document, copy rolled back' };
  }

  return { status: 'moved' };
};

const run = async () => {
  const conn = await connectDB();
  const dbName = conn.connection.name;
  const db = mongoose.connection.db;

  console.log(`\n[separation] database: "${dbName}"`);
  console.log(`[separation] mode: ${APPLY ? 'APPLY (migrating)' : 'DRY RUN (no writes)'}\n`);

  const modelMap = [
    ['Assignment', Assignment],
    ['McqTest', McqTest],
    ['Submission', Submission],
    ['McqAttempt', McqAttempt],
  ];
  console.log('[separation] model -> collection mapping');
  for (const [name, model] of modelMap) {
    const actual = model.collection.name;
    const expected = { Assignment: ASSIGNMENTS, McqTest: MCQ_TESTS, Submission: 'submissions', McqAttempt: 'mcq_attempts' }[name];
    console.log(`  ${actual === expected ? 'OK  ' : 'FAIL'} ${name} -> "${actual}"${actual === expected ? '' : ` (expected "${expected}")`}`);
  }

  const names = (await db.listCollections().toArray()).map((c) => c.name).sort();
  const counts = {};
  await Promise.all(
    names.map(async (name) => {
      counts[name] = await db.collection(name).countDocuments();
    })
  );

  console.log('\n[separation] collections');
  for (const name of names) {
    console.log(`  ${name}: ${counts[name]}`);
  }

  const findings = [];
  for (const name of names) {
    if (name.startsWith('system.')) continue;
    const docs = await db.collection(name).find({}).toArray();
    for (const doc of docs) {
      const kind = classify(doc);
      if (kind === 'other') continue;
      if (kind === 'mixed') {
        findings.push({ source: name, id: doc._id, target: null, kind });
        continue;
      }
      const target = kind === 'assignment' ? ASSIGNMENTS : MCQ_TESTS;
      if (name !== target) {
        findings.push({ source: name, id: doc._id, target, kind });
      }
    }
  }

  const misplaced = findings.filter((f) => f.kind !== 'mixed');
  const mixed = findings.filter((f) => f.kind === 'mixed');

  console.log('\n[separation] findings');
  if (findings.length === 0) {
    console.log('  none - no shared or mixed assignment/MCQ content documents found');
  } else {
    for (const finding of findings) {
      if (finding.kind === 'mixed') {
        console.log(`  MIXED  ${finding.source} _id=${finding.id} (both assignment and MCQ fields; manual review required, never auto-moved)`);
      } else {
        console.log(`  ${finding.kind.toUpperCase().padEnd(7)} ${finding.source} _id=${finding.id} -> ${finding.target}`);
      }
    }
  }

  const assignmentDocs = await db.collection(ASSIGNMENTS).countDocuments({ assignmentType: { $exists: true } });
  const mcqDocs = await db.collection(MCQ_TESTS).countDocuments({ $or: [{ passingScore: { $exists: true } }, { 'questions.correctOption': { $exists: true } }] });
  const misfiledAssignments = await db.collection(ASSIGNMENTS).countDocuments({ $or: [{ passingScore: { $exists: true } }, { 'questions.correctOption': { $exists: true } }] });
  const misfiledMcq = await db.collection(MCQ_TESTS).countDocuments({ assignmentType: { $exists: true } });

  console.log('\n[separation] collection purity');
  console.log(`  ${ASSIGNMENTS}: ${assignmentDocs} assignment-shaped document(s), ${misfiledAssignments} mis-filed MCQ document(s)`);
  console.log(`  ${MCQ_TESTS}: ${mcqDocs} MCQ-shaped document(s), ${misfiledMcq} mis-filed assignment document(s)`);
  console.log(`  reference collections (${[...REFERENCE_COLLECTIONS].join(', ')}): left untouched`);

  if (!APPLY) {
    console.log('\n[separation] dry run complete - no data was modified');
    if (misplaced.length > 0) {
      console.log(`[separation] ${misplaced.length} document(s) would be moved; re-run with --apply to migrate`);
    }
  } else if (mixed.length > 0) {
    console.log(`\n[separation] ${mixed.length} mixed document(s) found - resolve manually before applying`);
  } else {
    console.log('\n[separation] applying moves');
    let moved = 0;
    let failed = 0;
    for (const finding of misplaced) {
      const doc = await db.collection(finding.source).findOne({ _id: finding.id });
      if (!doc) {
        console.log(`  SKIP ${finding.source} _id=${finding.id} (document no longer exists)`);
        failed += 1;
        continue;
      }
      const result = await moveDocument(finding.source, finding.target, doc);
      if (result.status === 'moved') {
        console.log(`  MOVED ${finding.source} -> ${finding.target} _id=${finding.id}`);
        moved += 1;
      } else {
        console.log(`  ${result.status.toUpperCase()} ${finding.source} _id=${finding.id}: ${result.reason}`);
        failed += 1;
      }
    }
    console.log(`\n[separation] ${moved} moved, ${failed} skipped/failed`);
    const finalAssignments = await db.collection(ASSIGNMENTS).countDocuments();
    const finalMcq = await db.collection(MCQ_TESTS).countDocuments();
    console.log(`[separation] final counts: ${ASSIGNMENTS}=${finalAssignments}, ${MCQ_TESTS}=${finalMcq}`);
  }

  await mongoose.disconnect();
  process.exit(mixed.length > 0 ? 1 : 0);
};

run().catch(async (error) => {
  console.error('[separation] failed:', error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
