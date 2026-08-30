import mongoose from 'mongoose';
import Course from '../models/course.model.js';
import ApiError from '../utils/api-error.js';
import normalizeSlug from '../utils/slug.util.js';

const REGEX_ESCAPE = /[.*+?^${}()|[\]\\]/g;

const EDITABLE_FIELDS = [
  'title',
  'slug',
  'description',
  'shortDescription',
  'thumbnail',
  'demoVideoThumbnail',
  'demoVideoUrl',
  'price',
  'duration',
  'level',
  'category',
  'curriculum',
  'projects',
  'status',
];

const escapeRegex = (value) => String(value).replace(REGEX_ESCAPE, '\\$&');

const pickEditableFields = (data) => {
  const picked = {};
  for (const field of EDITABLE_FIELDS) {
    if (data[field] !== undefined) {
      picked[field] = data[field];
    }
  }
  return picked;
};

const sanitizeCourseSummary = (course) => ({
  id: course._id.toString(),
  title: course.title,
  slug: course.slug,
  shortDescription: course.shortDescription,
  thumbnail: course.thumbnail,
  demoVideoThumbnail: course.demoVideoThumbnail,
  demoVideoUrl: course.demoVideoUrl,
  price: course.price,
  duration: course.duration,
  level: course.level,
  category: course.category,
  status: course.status,
  createdAt: course.createdAt,
});

const sanitizeCourseDetail = (course) => ({
  ...sanitizeCourseSummary(course),
  description: course.description,
  curriculum: course.curriculum,
  projects: course.projects,
  updatedAt: course.updatedAt,
});

const listPublishedCourses = async ({ page = 1, limit = 12, category, level, search }) => {
  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  const filter = { status: 'published' };

  if (category) {
    filter.category = String(category).toLowerCase();
  }

  if (level) {
    filter.level = level;
  }

  if (search) {
    const searchRegex = new RegExp(escapeRegex(search), 'i');
    filter.$or = [
      { title: searchRegex },
      { shortDescription: searchRegex },
      { description: searchRegex },
    ];
  }

  const [total, documents] = await Promise.all([
    Course.countDocuments(filter),
    Course.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .lean(),
  ]);

  return {
    courses: documents.map(sanitizeCourseSummary),
    pagination: {
      page: pageNumber,
      limit: limitNumber,
      totalItems: total,
      totalPages: Math.ceil(total / limitNumber),
      hasNextPage: pageNumber * limitNumber < total,
    },
  };
};

const listAdminCourses = async ({ page = 1, limit = 50, category, level, search, status }) => {
  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  const filter = {};

  if (status) {
    filter.status = status;
  } else {
    filter.status = { $ne: 'archived' };
  }

  if (category) {
    filter.category = String(category).toLowerCase();
  }

  if (level) {
    filter.level = level;
  }

  if (search) {
    const searchRegex = new RegExp(escapeRegex(search), 'i');
    filter.$or = [
      { title: searchRegex },
      { shortDescription: searchRegex },
      { description: searchRegex },
    ];
  }

  const [total, documents] = await Promise.all([
    Course.countDocuments(filter),
    Course.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .lean(),
  ]);

  return {
    courses: documents.map(sanitizeCourseSummary),
    pagination: {
      page: pageNumber,
      limit: limitNumber,
      totalItems: total,
      totalPages: Math.ceil(total / limitNumber),
      hasNextPage: pageNumber * limitNumber < total,
    },
  };
};

const getPublishedCourseBySlug = async (slug) => {
  const course = await Course.findOne({ slug: normalizeSlug(slug), status: 'published' });
  if (!course) {
    throw new ApiError(404, 'Course not found');
  }
  return { course: sanitizeCourseDetail(course) };
};

const getAdminCourseById = async (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(404, 'Course not found');
  }

  const course = await Course.findById(id);
  if (!course) {
    throw new ApiError(404, 'Course not found');
  }

  return { course: sanitizeCourseDetail(course) };
};

const createCourse = async (data) => {
  const payload = pickEditableFields(data);

  if (!payload.slug && payload.title) {
    payload.slug = payload.title;
  }
  payload.slug = normalizeSlug(payload.slug);
  if (!payload.slug) {
    throw new ApiError(400, 'Course slug is required');
  }

  const existing = await Course.exists({ slug: payload.slug });
  if (existing) {
    throw new ApiError(409, 'A course with this slug already exists');
  }

  try {
    const course = await Course.create(payload);
    return { course: sanitizeCourseDetail(course) };
  } catch (err) {
    if (err?.code === 11000 && err?.keyPattern?.slug) {
      throw new ApiError(409, 'A course with this slug already exists');
    }
    throw err;
  }
};

const updateCourse = async (id, data) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(404, 'Course not found');
  }

  const updates = pickEditableFields(data);
  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, 'No valid fields provided for update');
  }

  if (updates.slug === undefined && updates.title) {
    updates.slug = updates.title;
  }

  if (updates.slug !== undefined) {
    const normalized = normalizeSlug(updates.slug);
    if (!normalized) {
      throw new ApiError(400, 'Course slug cannot be empty');
    }
    const conflict = await Course.exists({
      slug: normalized,
      _id: { $ne: new mongoose.Types.ObjectId(id) },
    });
    if (conflict) {
      throw new ApiError(409, 'A course with this slug already exists');
    }
    updates.slug = normalized;
  }

  const course = await Course.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  });

  if (!course) {
    throw new ApiError(404, 'Course not found');
  }

  return { course: sanitizeCourseDetail(course) };
};

const archiveCourse = async (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(404, 'Course not found');
  }

  const course = await Course.findByIdAndUpdate(
    id,
    { status: 'archived' },
    { new: true, runValidators: true }
  );

  if (!course) {
    throw new ApiError(404, 'Course not found');
  }

  return { course: sanitizeCourseDetail(course) };
};

export default {
  listPublishedCourses,
  listAdminCourses,
  getPublishedCourseBySlug,
  getAdminCourseById,
  createCourse,
  updateCourse,
  archiveCourse,
};
