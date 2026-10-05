#!/usr/bin/env node

/**
 * Consolidates multi-course content documents.
 *
 * Historically a bulk create loop wrote one document per selected course, so the
 * same MCQ test / assignment / coding task existed N times as N separate rows.
 * This script merges those duplicates into a single shared document whose
 * `courseIds` array covers every course the duplicates belonged to, remaps every
 * reference from the duplicate ids onto the surviving id, then deletes the
 * duplicates.
 *
 * It also normalises the legacy `{ courseId }` shape to `{ courseIds: [...] }`.
 *
 * Coding submissions additionally get their per-course attempt context:
 *   - `CodingSubmission.courseId` is backfilled (first of the task's courses
 *     the student is actively enrolled in; first active enrollment for
 *     orphaned rows whose task no longer exists)
 *   - attempt numbers are renumbered 1..n per (taskId, studentId, courseId)
 *     so merged duplicates cannot collide on the unique index
 *   - the legacy unique index {taskId, studentId, attemptNumber} is dropped
 *     before any write and replaced by {taskId, studentId, courseId, attemptNumber}
 *
 * Safety rules:
 *   - default mode is a dry run; `--apply` is required to write anything
 *   - a duplicate is never deleted while a reference cannot be remapped
 *   - unique-index collisions block the merge for that duplicate
 *     (coding submissions are renumbered instead of blocked)
 *   - references pointing at ids that no longer exist are reported, never deleted
 *   - idempotent: re-running after a successful apply reports "nothing to do"
 *
 * Usage:
 *   node scripts/consolidate-multi-course-content.js           # dry run
 *   node scripts/consolidate-multi-course-content.js --apply   # migrate
 */

import mongoose from 'mongoose';
import crypto from 'node:crypto';
import connectDB from '../src/config/db.js';

import McqTest from '../src/models/mcq.model.js';
import Assignment from '../src/models/assignment.model.js';
import CodingTask from '../src/models/coding-task.model.js';
import CodingSubmission from '../src/models/coding-submission.model.js';
import { ACTIVE_ACCESS_STATUSES } from '../src/utils/course-access.util.js';

const APPLY = process.argv.includes('--apply');

const CONTENT_FIELDS = [
  {
    name: 'mcq_tests',
    model: McqTest,
    references: [
      {
        collection: 'mcq_attempts',
        field: 'mcqTestId',
        uniqueBy: ['studentId', 'attemptNumber'],
      },
      {
        collection: 'course_progress',
        field: 'completedMcqs.mcqTestId',
        uniqueBy: null,
        arrayField: 'completedMcqs',
        arrayKey: 'mcqTestId',
      },
    ],
  },
  {
    name: 'assignments',
    model: Assignment,
    references: [
      {
        collection: 'submissions',
        field: 'assignmentId',
        uniqueBy: ['studentId', 'attemptNumber'],
        extraUnique: { when: { activeSubmission: true }, key: ['studentId'] },
      },
      {
        collection: 'course_progress',
        field: 'completedAssignments.assignmentId',
        uniqueBy: null,
        arrayField: 'completedAssignments',
        arrayKey: 'assignmentId',
      },
    ],
  },
  {
    name: 'coding_tasks',
    model: CodingTask,
    references: [
      {
        collection: 'coding_submissions',
        field: 'taskId',
        uniqueBy: ['studentId', 'attemptNumber'],
        // Attempt numbers are recomputed per (taskId, studentId, courseId)
        // after the remap, so a collision never blocks the merge.
        renumber: true,
      },
    ],
  },
];

const IGNORED_KEYS = new Set(['_id', 'courseId', 'courseIds', 'createdAt', 'updatedAt', '__v']);

const stableStringify = (value) => {
  if (value === null || value === undefined) return 'null';
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (typeof value === 'object') {
    if (typeof value.toHexString === 'function') return JSON.stringify(String(value));
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

const contentHash = (doc) => {
  const payload = {};
  for (const [key, value] of Object.entries(doc)) {
    if (!IGNORED_KEYS.has(key)) payload[key] = value;
  }
  return crypto.createHash('sha256').update(stableStringify(payload)).digest('hex');
};

const asId = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') {
    if (value._id !== undefined) return String(value._id);
    if (typeof value.toHexString === 'function') return value.toHexString();
    if (typeof value.toString === 'function') return value.toString();
    return null;
  }
  return String(value);
};

const oid = (value) => new mongoose.Types.ObjectId(String(value));

const readReferenceIds = (doc, field) => {
  if (!field.includes('.')) return [asId(doc[field])].filter(Boolean);
  const [head, tail] = field.split('.');
  const rows = Array.isArray(doc[head]) ? doc[head] : [];
  return rows.map((row) => asId(row?.[tail])).filter(Boolean);
};

// Keys that must stay unique if two documents collapse onto one id.
const uniqueKeysFor = (refDoc, reference) => {
  if (reference.renumber) return [];
  const keys = [];
  if (reference.uniqueBy) {
    keys.push(`main:${stableStringify(reference.uniqueBy.map((field) => refDoc[field]))}`);
  }
  if (reference.extraUnique) {
    const matchesWhen = Object.entries(reference.extraUnique.when).every(
      ([field, expected]) => refDoc[field] === expected
    );
    if (matchesWhen) {
      keys.push(`extra:${stableStringify(reference.extraUnique.key.map((field) => refDoc[field]))}`);
    }
  }
  return keys;
};

const normalizeLegacyShape = async (collection) => {
  const docs = await collection.find({ courseId: { $exists: true } }).toArray();
  for (const doc of docs) {
    const legacy = Array.isArray(doc.courseIds) && doc.courseIds.length > 0
      ? doc.courseIds
      : doc.courseId
        ? [doc.courseId]
        : [];
    // eslint-disable-next-line no-await-in-loop
    await collection.updateOne(
      { _id: doc._id },
      { $set: { courseIds: legacy }, $unset: { courseId: '' } }
    );
  }
  return docs.length;
};

const docCourseIds = (doc) =>
  Array.isArray(doc.courseIds) && doc.courseIds.length > 0
    ? doc.courseIds
    : doc.courseId
      ? [doc.courseId]
      : [];

const buildClusters = (docs) => {
  const byKey = new Map();
  for (const doc of docs) {
    const key = contentHash(doc);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(doc);
  }
  return [...byKey.values()].filter((group) => group.length > 1);
};

const planCollection = async (spec) => {
  const collection = mongoose.connection.db.collection(spec.name);
  const docs = await collection.find({}).toArray();
  const clusters = buildClusters(docs);

  const refState = [];
  for (const reference of spec.references) {
    const refDocs = await mongoose.connection.db
      .collection(reference.collection)
      .find({})
      .toArray();
    const byTarget = new Map();
    for (const refDoc of refDocs) {
      for (const targetId of readReferenceIds(refDoc, reference.field)) {
        if (!byTarget.has(targetId)) byTarget.set(targetId, []);
        byTarget.get(targetId).push(refDoc);
      }
    }
    refState.push({ reference, refDocs, byTarget });
  }

  const referencedIds = new Set();
  for (const state of refState) {
    for (const id of state.byTarget.keys()) referencedIds.add(id);
  }

  const existingIds = new Set(docs.map((doc) => String(doc._id)));
  const orphanReport = [];
  for (const state of refState) {
    for (const [id, rows] of state.byTarget.entries()) {
      if (!existingIds.has(id)) {
        orphanReport.push({
          collection: state.reference.collection,
          field: state.reference.field,
          id,
          count: rows.length,
        });
      }
    }
  }

  const merges = [];
  for (const cluster of clusters) {
    const sorted = [...cluster].sort((a, b) => String(a._id).localeCompare(String(b._id)));
    const referenced = sorted.filter((doc) => referencedIds.has(String(doc._id)));
    const survivor = (referenced.length > 0 ? referenced : sorted)[0];
    const duplicates = sorted.filter((doc) => String(doc._id) !== String(survivor._id));

    const mergedCourseIds = [];
    for (const doc of sorted) {
      for (const rawId of docCourseIds(doc)) {
        const id = String(rawId);
        if (!mergedCourseIds.includes(id)) mergedCourseIds.push(id);
      }
    }

    const blocked = [];
    const removable = [];
    for (const duplicate of duplicates) {
      let collision = false;
      for (const state of refState) {
        const survivorRefs = state.byTarget.get(String(survivor._id)) || [];
        const survivorKeys = new Set(
          survivorRefs.flatMap((refDoc) => uniqueKeysFor(refDoc, state.reference))
        );
        const duplicateRefs = state.byTarget.get(String(duplicate._id)) || [];
        for (const refDoc of duplicateRefs) {
          for (const key of uniqueKeysFor(refDoc, state.reference)) {
            if (survivorKeys.has(key)) {
              collision = true;
              break;
            }
          }
          if (collision) break;
        }
        if (collision) break;
      }
      if (collision) blocked.push(String(duplicate._id));
      else removable.push(String(duplicate._id));
    }

    merges.push({
      survivorId: String(survivor._id),
      survivorTitle: survivor.title || survivor.topic || String(survivor._id),
      duplicateIds: duplicates.map((doc) => String(doc._id)),
      blockedIds: blocked,
      removableIds: removable,
      mergedCourseIds,
      courseIdsBefore: docCourseIds(survivor).map(String),
    });
  }

  return { totalDocs: docs.length, merges, refState, orphanReport };
};

const remapArrayField = async (reference, duplicateId, survivorId) => {
  const db = mongoose.connection.db;
  const affected = await db
    .collection(reference.collection)
    .find({ [reference.field]: oid(duplicateId) })
    .toArray();

  let modified = 0;
  for (const doc of affected) {
    const original = doc[reference.arrayField] || [];
    const seen = new Set();
    const cleaned = original.map((entry) => {
      const currentId = asId(entry?.[reference.arrayKey]);
      if (currentId === duplicateId) {
        return { ...entry, [reference.arrayKey]: oid(survivorId) };
      }
      return entry;
    });
    const deduped = cleaned.filter((entry) => {
      const id = asId(entry?.[reference.arrayKey]);
      if (!id) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    if (stableStringify(deduped) !== stableStringify(original)) {
      await db
        .collection(reference.collection)
        .updateOne({ _id: doc._id }, { $set: { [reference.arrayField]: deduped } });
      modified += 1;
    }
  }
  return modified;
};

const applyCollection = async (spec, plan) => {
  const collection = mongoose.connection.db.collection(spec.name);
  const db = mongoose.connection.db;
  let removed = 0;
  let kept = 0;
  let remappedRefs = 0;

  for (const merge of plan.merges) {
    if (merge.blockedIds.length > 0) {
      kept += merge.blockedIds.length;
      console.log(
        `    KEEP   _id=${merge.survivorId}: ${merge.blockedIds.length} duplicate(s) blocked by unique-index collision`
      );
    }

    if (merge.mergedCourseIds.join(',') !== merge.courseIdsBefore.join(',')) {
      await collection.updateOne(
        { _id: oid(merge.survivorId) },
        { $set: { courseIds: merge.mergedCourseIds.map(oid) } }
      );
    }

    for (const duplicateId of merge.removableIds) {
      for (const state of plan.refState) {
        const reference = state.reference;
        const isArray = Boolean(reference.arrayField);

        if (isArray) {
          // eslint-disable-next-line no-await-in-loop
          const count = await remapArrayField(reference, duplicateId, merge.survivorId);
          remappedRefs += count;
          continue;
        }

        // eslint-disable-next-line no-await-in-loop
        const result = await db.collection(reference.collection).updateMany(
          { [reference.field]: oid(duplicateId) },
          { $set: { [reference.field]: oid(merge.survivorId) } }
        );
        remappedRefs += result.modifiedCount;
      }

      // eslint-disable-next-line no-await-in-loop
      const deleteResult = await collection.deleteOne({ _id: oid(duplicateId) });
      if (deleteResult.deletedCount === 1) removed += 1;
      else kept += 1;
    }
  }

  return { removed, kept, remappedRefs };
};

const LEGACY_SUBMISSION_INDEX = 'taskId_1_studentId_1_attemptNumber_1';

const submissionCollection = () => mongoose.connection.db.collection('coding_submissions');

const dropLegacySubmissionIndex = async () => {
  const existing = await submissionCollection().indexes();
  const hasLegacy = existing.some((index) => index.name === LEGACY_SUBMISSION_INDEX);
  if (!hasLegacy) return { hadLegacy: false, dropped: false };
  if (!APPLY) return { hadLegacy: true, dropped: false };
  await submissionCollection().dropIndex(LEGACY_SUBMISSION_INDEX);
  return { hadLegacy: true, dropped: true };
};

const reportSubmissionContext = async () => {
  const collection = submissionCollection();
  const total = await collection.countDocuments();
  const missingCourseId = await collection.countDocuments({ courseId: { $exists: false } });
  const rows = await collection.find({}).toArray();

  const resolve = buildSubmissionCourseResolver();
  const groups = new Map();
  for (const row of rows) {
    // eslint-disable-next-line no-await-in-loop
    const courseId = row.courseId ? String(row.courseId) : await resolve(row);
    if (!courseId) continue;
    const key = `${String(row.taskId)}|${String(row.studentId)}|${courseId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  let wouldRenumber = 0;
  for (const groupRows of groups.values()) {
    groupRows.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
        String(a._id).localeCompare(String(b._id))
    );
    groupRows.forEach((row, index) => {
      if (row.attemptNumber !== index + 1) wouldRenumber += 1;
    });
  }

  return { total, missingCourseId, wouldRenumber, scopedGroups: groups.size };
};

// Mirrors the service rule: first of the task's own courses in which the
// student is actively enrolled. Falls back to the first task course (attempt
// happened under that content) and, for orphaned rows, the student's first
// active enrollment.
const buildSubmissionCourseResolver = () => {
  const db = mongoose.connection.db;
  const taskCache = new Map();
  const enrollmentCache = new Map();

  const loadTask = async (taskId) => {
    const key = String(taskId);
    if (!taskCache.has(key)) {
      taskCache.set(key, await db.collection('coding_tasks').findOne({ _id: oid(key) }));
    }
    return taskCache.get(key);
  };

  const loadEnrollments = async (userId) => {
    const key = String(userId);
    if (!enrollmentCache.has(key)) {
      const rows = await db
        .collection('enrollments')
        .find({ userId: oid(key), status: { $in: ACTIVE_ACCESS_STATUSES } })
        .toArray();
      enrollmentCache.set(key, [...new Set(rows.map((row) => String(row.courseId)))].sort());
    }
    return enrollmentCache.get(key);
  };

  return async (submission) => {
    const task = await loadTask(submission.taskId);
    if (task) {
      const taskCourseIds = docCourseIds(task).map(String);
      const enrolled = new Set(await loadEnrollments(submission.studentId));
      return taskCourseIds.find((id) => enrolled.has(id)) || taskCourseIds[0] || null;
    }
    const active = await loadEnrollments(submission.studentId);
    return active[0] || null;
  };
};

const backfillSubmissionCourseIds = async () => {
  const submissions = submissionCollection();
  const missing = await submissions.find({ courseId: { $exists: false } }).toArray();
  const resolve = buildSubmissionCourseResolver();

  let backfilled = 0;
  const unresolved = [];
  for (const submission of missing) {
    // eslint-disable-next-line no-await-in-loop
    const courseId = await resolve(submission);
    if (courseId) {
      // eslint-disable-next-line no-await-in-loop
      await submissions.updateOne({ _id: submission._id }, { $set: { courseId: oid(courseId) } });
      backfilled += 1;
    } else {
      unresolved.push(String(submission._id));
    }
  }

  return { backfilled, unresolved };
};

// 1..n per (taskId, studentId, courseId), oldest first, so history survives a
// duplicate merge without ever colliding on the new unique index.
const renumberSubmissionAttempts = async () => {
  const collection = submissionCollection();
  const rows = await collection.find({}).toArray();

  const groups = new Map();
  for (const row of rows) {
    const key = `${String(row.taskId)}|${String(row.studentId)}|${String(row.courseId)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  let renumbered = 0;
  const updates = [];
  for (const groupRows of groups.values()) {
    groupRows.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
        String(a._id).localeCompare(String(b._id))
    );
    for (let index = 0; index < groupRows.length; index += 1) {
      const next = index + 1;
      if (groupRows[index].attemptNumber !== next) {
        updates.push(
          collection.updateOne({ _id: groupRows[index]._id }, { $set: { attemptNumber: next } })
        );
        renumbered += 1;
      }
    }
  }
  await Promise.all(updates);
  return { renumbered };
};

const run = async () => {
  const conn = await connectDB();
  const dbName = conn.connection.name;
  const db = mongoose.connection.db;

  console.log(`\n[consolidate] database: "${dbName}"`);
  console.log(`[consolidate] mode: ${APPLY ? 'APPLY (migrating)' : 'DRY RUN (no writes)'}\n`);

  // The legacy unique index must go before any taskId remap or attempt
  // renumbering, otherwise intermediate writes can collide with it.
  const legacyIndex = await dropLegacySubmissionIndex();
  console.log(
    `[consolidate] legacy submission unique index {taskId, studentId, attemptNumber}: ${
      legacyIndex.hadLegacy
        ? APPLY
          ? 'dropped'
          : 'present (will be dropped on --apply)'
        : 'not present'
    }`
  );

  let totalDuplicates = 0;
  let totalRemoved = 0;
  let totalRemapped = 0;
  let totalOrphans = 0;
  let totalBlocked = 0;

  for (const spec of CONTENT_FIELDS) {
    const collection = db.collection(spec.name);
    const before = await collection.countDocuments();
    const legacy = await collection.countDocuments({ courseId: { $exists: true } });

    let converted = 0;
    if (APPLY) {
      converted = await normalizeLegacyShape(collection);
    } else {
      converted = legacy;
    }

    const plan = await planCollection(spec);

    const duplicateCount = plan.merges.reduce((sum, merge) => sum + merge.duplicateIds.length, 0);
    const removableCount = plan.merges.reduce((sum, merge) => sum + merge.removableIds.length, 0);
    const blockedCount = duplicateCount - removableCount;
    totalDuplicates += duplicateCount;
    totalBlocked += blockedCount;
    totalOrphans += plan.orphanReport.length;

    console.log(`[consolidate] ${spec.name}`);
    console.log(`  documents: ${before}`);
    console.log(`  legacy {courseId} rows ${APPLY ? 'converted' : 'to convert'} -> {courseIds}: ${converted}`);
    console.log(`  duplicate groups: ${plan.merges.length}`);
    console.log(
      `  duplicate documents: ${duplicateCount} (${removableCount} removable, ${blockedCount} blocked)`
    );
    console.log(`  reference orphans (reported only, never deleted): ${plan.orphanReport.length}`);

    for (const merge of plan.merges) {
      console.log(`    group "${merge.survivorTitle}"`);
      console.log(`      keep    _id=${merge.survivorId}`);
      for (const id of merge.duplicateIds) {
        const isBlocked = merge.blockedIds.includes(id);
        console.log(
          `      ${isBlocked ? 'blocked' : 'merge  '} _id=${id}${isBlocked ? ' (unique-index collision)' : ''}`
        );
      }
      console.log(`      courseIds -> [${merge.mergedCourseIds.join(', ')}]`);
    }

    for (const orphan of plan.orphanReport) {
      console.log(
        `    ORPHAN ${orphan.collection}.${orphan.field} -> ${orphan.id} (${orphan.count} row(s), target document missing)`
      );
    }

    if (APPLY) {
      const result = await applyCollection(spec, plan);
      totalRemoved += result.removed;
      totalRemapped += result.remappedRefs;
      console.log(`  applied: ${result.removed} removed, ${result.remappedRefs} reference(s) remapped`);

      await spec.model.syncIndexes();
      console.log(`  indexes: synced to schema for "${spec.model.collection.name}"`);
    }

    const after = await collection.countDocuments();
    console.log(`  documents after: ${after}\n`);
  }

  // Per-course attempt context for coding submissions.
  const contextBefore = await reportSubmissionContext();
  console.log('[consolidate] coding_submissions course context');
  console.log(`  documents: ${contextBefore.total}`);
  console.log(
    `  missing courseId ${APPLY ? 'backfilled' : 'to backfill'} -> ${contextBefore.missingCourseId}`
  );
  console.log(
    `  attempt numbers ${APPLY ? 'renumbered' : 'to renumber'} (per task+student+course) -> ${contextBefore.wouldRenumber}`
  );
  console.log(`  scoped (task, student, course) groups: ${contextBefore.scopedGroups}`);

  if (APPLY) {
    const backfill = await backfillSubmissionCourseIds();
    console.log(`  backfilled courseId on ${backfill.backfilled} submission(s)`);
    if (backfill.unresolved.length > 0) {
      backfill.unresolved.forEach((id) => {
        console.log(`    UNRESOLVED ${id}: no task course and no active enrollment, left unset`);
      });
    }

    const renumber = await renumberSubmissionAttempts();
    console.log(`  renumbered ${renumber.renumbered} attempt number(s)`);

    await CodingSubmission.syncIndexes();
    console.log(
      '  indexes: synced to schema for "coding_submissions" (unique {taskId, studentId, courseId, attemptNumber})'
    );

    const contextAfter = await reportSubmissionContext();
    console.log(
      `  after: ${contextAfter.total} documents, ${contextAfter.missingCourseId} without courseId, ${contextAfter.wouldRenumber} attempt numbers out of sequence`
    );
  }
  console.log('');

  console.log(`[consolidate] duplicates found: ${totalDuplicates}`);
  console.log(`[consolidate] blocked (kept, never deleted): ${totalBlocked}`);
  console.log(`[consolidate] orphaned references reported: ${totalOrphans}`);

  if (!APPLY) {
    console.log('\n[consolidate] dry run complete - no data was modified');
    const pendingWork =
      totalDuplicates > 0 ||
      contextBefore.missingCourseId > 0 ||
      contextBefore.wouldRenumber > 0 ||
      legacyIndex.hadLegacy;
    if (pendingWork) {
      console.log('[consolidate] re-run with --apply to migrate');
    } else {
      console.log('[consolidate] nothing to consolidate');
    }
  } else {
    console.log(
      `[consolidate] applied: ${totalRemoved} duplicate(s) removed, ${totalRemapped} reference(s) remapped`
    );
  }

  await mongoose.disconnect();
  process.exit(0);
};

run().catch(async (error) => {
  console.error('[consolidate] failed:', error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
