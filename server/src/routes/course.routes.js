import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  listCourses,
  listAdminCourses,
  getCourseBySlug,
  getAdminCourseById,
  createCourse,
  updateCourse,
  archiveCourse,
} from '../controllers/course.controller.js';
import validate from '../middleware/validate.middleware.js';
import requireAuth from '../middleware/auth.middleware.js';
import requireRole from '../middleware/role.middleware.js';

const router = Router();

const ADMIN_ROLES = ['admin', 'superAdmin'];

const LEVELS = ['basic', 'intermediate', 'advanced'];
const COURSE_STATUSES = ['draft', 'published', 'archived'];
const IMAGE_MAX_LENGTH = 2_500_000;

const isHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const isImageValue = (value) => {
  if (!value) return true;
  return isHttpUrl(value) || /^data:image\/(?:png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i.test(value);
};

const imageRule = (field, label) =>
  body(field)
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: IMAGE_MAX_LENGTH })
    .withMessage(`${label} is too large`)
    .custom((value) => isImageValue(value))
    .withMessage(`${label} must be an image upload or HTTP(S) image URL`);

const requiredImageRule = (field, label) =>
  body(field)
    .trim()
    .notEmpty()
    .withMessage(`${label} is required`)
    .isLength({ max: IMAGE_MAX_LENGTH })
    .withMessage(`${label} is too large`)
    .custom((value) => isImageValue(value))
    .withMessage(`${label} must be an image upload or HTTP(S) image URL`);

const urlRule = (field, label) =>
  body(field)
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 2048 })
    .withMessage(`${label} cannot exceed 2048 characters`)
    .custom((value) => !value || isHttpUrl(value))
    .withMessage(`${label} must be a valid HTTP(S) URL`);

const requiredUrlRule = (field, label) =>
  body(field)
    .trim()
    .notEmpty()
    .withMessage(`${label} is required`)
    .isLength({ max: 2048 })
    .withMessage(`${label} cannot exceed 2048 characters`)
    .custom((value) => isHttpUrl(value))
    .withMessage(`${label} must be a valid HTTP(S) URL`);

const listValidation = [
  query('page')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional({ values: 'falsy' })
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
    .toInt(),
  query('category')
    .optional({ values: 'falsy' })
    .trim()
    .isString()
    .withMessage('Category must be a string')
    .isLength({ max: 80 })
    .withMessage('Category cannot exceed 80 characters'),
  query('level')
    .optional({ values: 'falsy' })
    .trim()
    .isIn(LEVELS)
    .withMessage('Level must be one of: basic, intermediate, advanced'),
  query('search')
    .optional({ values: 'falsy' })
    .trim()
    .isString()
    .withMessage('Search must be a string')
    .isLength({ max: 100 })
    .withMessage('Search cannot exceed 100 characters'),
];

const adminListValidation = [
  ...listValidation,
  query('status')
    .optional({ values: 'falsy' })
    .isIn(COURSE_STATUSES)
    .withMessage('Status must be one of: draft, published, archived'),
];

const slugParamValidation = [
  param('slug')
    .trim()
    .isLength({ min: 1, max: 150 })
    .withMessage('Invalid course slug'),
];

const idParamValidation = [
  param('id').isMongoId().withMessage('Invalid course id'),
];

const curriculumItemRules = [
  body('curriculum.*.title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Curriculum module titles must be between 1 and 200 characters'),
];

const projectsItemRules = [
  body('projects.*.title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Project titles must be between 1 and 200 characters'),
];

const slugBodyRule = [
  body('slug')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 150 })
    .withMessage('Slug cannot exceed 150 characters'),
];

const createValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 150 })
    .withMessage('Title cannot exceed 150 characters'),
  ...slugBodyRule,
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 5000 })
    .withMessage('Description cannot exceed 5000 characters'),
  body('shortDescription')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 300 })
    .withMessage('Short description cannot exceed 300 characters'),
  requiredImageRule('thumbnail', 'Course image'),
  requiredImageRule('demoVideoThumbnail', 'Demo video thumbnail'),
  requiredUrlRule('demoVideoUrl', 'Demo video URL'),
  body('price')
    .exists()
    .withMessage('Price is required')
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number'),
  body('duration')
    .exists()
    .withMessage('Duration is required')
    .isInt({ min: 0 })
    .withMessage('Duration must be a non-negative integer'),
  body('level')
    .trim()
    .notEmpty()
    .withMessage('Course level is required')
    .isIn(LEVELS)
    .withMessage('Level must be one of: basic, intermediate, advanced'),
  body('category')
    .optional({ values: 'falsy' })
    .trim()
    .customSanitizer((value) => value.toLowerCase())
    .isLength({ max: 80 })
    .withMessage('Category cannot exceed 80 characters'),
  body('status')
    .optional({ values: 'falsy' })
    .isIn(COURSE_STATUSES)
    .withMessage('Status must be one of: draft, published, archived'),
  body('curriculum').optional().isArray().withMessage('Curriculum must be an array'),
  ...curriculumItemRules,
  body('projects').optional().isArray().withMessage('Projects must be an array'),
  ...projectsItemRules,
];

const updateValidation = [
  ...idParamValidation,
  ...slugBodyRule,
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 150 })
    .withMessage('Title cannot exceed 150 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 5000 })
    .withMessage('Description cannot exceed 5000 characters'),
  body('shortDescription')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 300 })
    .withMessage('Short description cannot exceed 300 characters'),
  requiredImageRule('thumbnail', 'Course image'),
  requiredImageRule('demoVideoThumbnail', 'Demo video thumbnail'),
  requiredUrlRule('demoVideoUrl', 'Demo video URL'),
  body('price')
    .exists()
    .withMessage('Price is required')
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number'),
  body('duration')
    .exists()
    .withMessage('Duration is required')
    .isInt({ min: 0 })
    .withMessage('Duration must be a non-negative integer'),
  body('level')
    .trim()
    .notEmpty()
    .withMessage('Course level is required')
    .isIn(LEVELS)
    .withMessage('Level must be one of: basic, intermediate, advanced'),
  body('category')
    .optional({ values: 'falsy' })
    .trim()
    .customSanitizer((value) => value.toLowerCase())
    .isLength({ max: 80 })
    .withMessage('Category cannot exceed 80 characters'),
  body('status')
    .optional({ values: 'falsy' })
    .isIn(COURSE_STATUSES)
    .withMessage('Status must be one of: draft, published, archived'),
  body('curriculum').optional().isArray().withMessage('Curriculum must be an array'),
  ...curriculumItemRules,
  body('projects').optional().isArray().withMessage('Projects must be an array'),
  ...projectsItemRules,
];

router.get('/', validate(listValidation), listCourses);
router.get(
  '/admin',
  requireAuth,
  requireRole(...ADMIN_ROLES),
  validate(adminListValidation),
  listAdminCourses
);
router.get(
  '/admin/:id',
  requireAuth,
  requireRole(...ADMIN_ROLES),
  validate(idParamValidation),
  getAdminCourseById
);
router.get('/:slug', validate(slugParamValidation), getCourseBySlug);
router.post(
  '/',
  requireAuth,
  requireRole(...ADMIN_ROLES),
  validate(createValidation),
  createCourse
);
router.patch(
  '/:id',
  requireAuth,
  requireRole(...ADMIN_ROLES),
  validate(updateValidation),
  updateCourse
);
router.delete(
  '/:id',
  requireAuth,
  requireRole(...ADMIN_ROLES),
  validate(idParamValidation),
  archiveCourse
);

export default router;
