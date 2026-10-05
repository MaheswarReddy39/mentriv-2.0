import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  listTasks,
  listGroups,
  getTask,
  createTask,
  createTasksForCourses,
  updateTask,
  listSubmissions,
  createSubmission,
} from '../controllers/coding-task.controller.js';
import validate from '../middleware/validate.middleware.js';
import requireAuth from '../middleware/auth.middleware.js';
import requireRole from '../middleware/role.middleware.js';
import { MAX_BULK_COURSES } from '../utils/course-ids.util.js';

const router = Router();

const ADMIN_ROLES = ['admin', 'superAdmin'];
const TASK_CREATE_ROLES = ['teacher', ...ADMIN_ROLES];

const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const TASK_TYPES = [
  'Coding Problem',
  'Frontend Task',
  'Backend / API Task',
  'React Task',
  'MERN Task',
];
const STATUSES = ['draft', 'published', 'archived'];
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const idParamRule = param('id').isMongoId().withMessage('Invalid coding task id');
const courseIdParamRule = param('courseId').isMongoId().withMessage('Invalid course id');

const taskOrderRule = body('taskOrder')
  .optional({ values: 'falsy' })
  .isInt({ min: 0 })
  .withMessage('Task order must be a non-negative integer');

const listQueryRules = [
  query('courseId')
    .optional({ values: 'falsy' })
    .isMongoId()
    .withMessage('Invalid course id'),
  query('level')
    .optional({ values: 'falsy' })
    .isIn(LEVELS)
    .withMessage('Level must be one of: Beginner, Intermediate, Advanced'),
  query('topic')
    .optional({ values: 'falsy' })
    .isLength({ max: 120 })
    .withMessage('Topic cannot exceed 120 characters'),
];

const detailRules = () => [
  body('description')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description cannot exceed 5000 characters'),
  body('language')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 40 })
    .withMessage('Language cannot exceed 40 characters'),
  body('inputFormat')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Input format cannot exceed 2000 characters'),
  body('outputFormat')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Output format cannot exceed 2000 characters'),
  body('constraints')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Constraints cannot exceed 2000 characters'),
  body('starterCode')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 10000 })
    .withMessage('Starter code cannot exceed 10000 characters'),
  body('requirements')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Requirements cannot exceed 5000 characters'),
  body('starterFiles')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Starter files cannot exceed 5000 characters'),
  body('evaluationRequirements')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Evaluation requirements cannot exceed 5000 characters'),
  body('apiRequirements')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 5000 })
    .withMessage('API requirements cannot exceed 5000 characters'),
  body('frontendRequirements')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Frontend requirements cannot exceed 5000 characters'),
  body('backendRequirements')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Backend requirements cannot exceed 5000 characters'),
  body('databaseRequirements')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Database requirements cannot exceed 5000 characters'),
  body('sampleTestCases').optional().isArray().withMessage('Sample test cases must be an array'),
  body('sampleTestCases.*.input')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Sample input cannot exceed 5000 characters'),
  body('sampleTestCases.*.expected')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Sample expected output cannot exceed 5000 characters'),
  body('hiddenTestCases').optional().isArray().withMessage('Hidden test cases must be an array'),
  body('hiddenTestCases.*.input')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Hidden input cannot exceed 5000 characters'),
  body('hiddenTestCases.*.expected')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Hidden expected output cannot exceed 5000 characters'),
  body('apiTestCases').optional().isArray().withMessage('API test cases must be an array'),
  body('apiTestCases.*.method')
    .optional({ values: 'falsy' })
    .isIn(HTTP_METHODS)
    .withMessage('HTTP method must be one of: GET, POST, PUT, PATCH, DELETE'),
  body('apiTestCases.*.endpoint')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 300 })
    .withMessage('Endpoint cannot exceed 300 characters'),
  body('apiTestCases.*.expected')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Expected result cannot exceed 2000 characters'),
];

const createBodyValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 150 })
    .withMessage('Title cannot exceed 150 characters'),
  body('level').isIn(LEVELS).withMessage('Level must be one of: Beginner, Intermediate, Advanced'),
  body('topic')
    .trim()
    .notEmpty()
    .withMessage('Topic is required')
    .isLength({ max: 120 })
    .withMessage('Topic cannot exceed 120 characters'),
  body('taskType').isIn(TASK_TYPES).withMessage('Invalid task type'),
  body('difficulty').isIn(DIFFICULTIES).withMessage('Difficulty must be one of: Easy, Medium, Hard'),
  body('status')
    .optional({ values: 'falsy' })
    .isIn(STATUSES)
    .withMessage('Status must be one of: draft, published, archived'),
  taskOrderRule,
  ...detailRules(),
];

const courseIdsRules = [
  body('courseIds')
    .isArray({ min: 1, max: MAX_BULK_COURSES })
    .withMessage(`Select between 1 and ${MAX_BULK_COURSES} courses`),
  body('courseIds.*').isMongoId().withMessage('Invalid course id'),
  body('courseIds').custom((value) => {
    if (!Array.isArray(value)) return true;
    if (new Set(value.map(String)).size !== value.length) {
      throw new Error('Duplicate courses are not allowed');
    }
    return true;
  }),
];

const createValidation = [courseIdParamRule, ...createBodyValidation];

const bulkCreateValidation = [...courseIdsRules, ...createBodyValidation];

const updateValidation = [
  idParamRule,
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 150 })
    .withMessage('Title cannot exceed 150 characters'),
  body('level')
    .optional()
    .isIn(LEVELS)
    .withMessage('Level must be one of: Beginner, Intermediate, Advanced'),
  body('topic')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Topic cannot be empty')
    .isLength({ max: 120 })
    .withMessage('Topic cannot exceed 120 characters'),
  body('taskType').optional().isIn(TASK_TYPES).withMessage('Invalid task type'),
  body('difficulty')
    .optional()
    .isIn(DIFFICULTIES)
    .withMessage('Difficulty must be one of: Easy, Medium, Hard'),
  body('status')
    .optional({ values: 'falsy' })
    .isIn(STATUSES)
    .withMessage('Status must be one of: draft, published, archived'),
  taskOrderRule,
  ...detailRules(),
  body('courseId')
    .not()
    .exists()
    .withMessage('Coding tasks cannot be moved between courses'),
  body('courseIds')
    .not()
    .exists()
    .withMessage('Coding tasks cannot be moved between courses'),
];

router.get('/coding-tasks', requireAuth, validate(listQueryRules), listTasks);
router.get('/coding-task-groups', requireAuth, listGroups);
router.get(
  '/coding-tasks/:id/submissions',
  requireAuth,
  requireRole('student'),
  validate([
    idParamRule,
    query('courseId')
      .optional({ values: 'falsy' })
      .isMongoId()
      .withMessage('Invalid course id'),
  ]),
  listSubmissions
);
router.post(
  '/coding-tasks/:id/submissions',
  requireAuth,
  requireRole('student'),
  validate([
    idParamRule,
    body('courseId')
      .optional({ values: 'falsy' })
      .isMongoId()
      .withMessage('Invalid course id'),
    body('code')
      .optional({ values: 'falsy' })
      .trim()
      .isLength({ max: 10000 })
      .withMessage('Code cannot exceed 10000 characters'),
    body('language')
      .optional({ values: 'falsy' })
      .trim()
      .isLength({ max: 40 })
      .withMessage('Language cannot exceed 40 characters'),
  ]),
  createSubmission
);
router.get('/coding-tasks/:id', requireAuth, validate([idParamRule]), getTask);
router.post(
  '/coding-tasks/bulk',
  requireAuth,
  requireRole(...TASK_CREATE_ROLES),
  validate(bulkCreateValidation),
  createTasksForCourses
);
router.post(
  '/courses/:courseId/coding-tasks',
  requireAuth,
  requireRole(...TASK_CREATE_ROLES),
  validate(createValidation),
  createTask
);
router.patch(
  '/coding-tasks/:id',
  requireAuth,
  requireRole(...TASK_CREATE_ROLES),
  validate(updateValidation),
  updateTask
);

export default router;
