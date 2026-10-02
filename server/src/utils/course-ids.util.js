import mongoose from 'mongoose';
import Course from '../models/course.model.js';
import ApiError from './api-error.js';

const MAX_BULK_COURSES = 50;

const normalizeCourseIds = async (courseIdsInput) => {
  if (!Array.isArray(courseIdsInput) || courseIdsInput.length === 0) {
    throw new ApiError(400, 'Select at least one course');
  }

  const courseIds = [];
  const seen = new Set();

  for (const entry of courseIdsInput) {
    const courseId = String(entry ?? '').trim();
    if (!mongoose.isValidObjectId(courseId)) {
      throw new ApiError(400, 'Invalid course id in the selected courses');
    }
    if (seen.has(courseId)) continue;
    seen.add(courseId);
    courseIds.push(courseId);
  }

  if (courseIds.length > MAX_BULK_COURSES) {
    throw new ApiError(400, `You can select at most ${MAX_BULK_COURSES} courses at once`);
  }

  const existing = await Course.find({ _id: { $in: courseIds } }).select('_id').lean();
  if (existing.length !== courseIds.length) {
    throw new ApiError(404, 'One or more selected courses were not found');
  }

  return courseIds;
};

export { MAX_BULK_COURSES, normalizeCourseIds };
