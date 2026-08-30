import { Router } from 'express';
import { body, query } from 'express-validator';
import {
  register,
  verifyEmail,
  requestActivationEmail,
  activateAccount,
  forgotPassword,
  resetPassword,
  logout,
  login,
  registerTeacher,
  me,
  updateMe,
  changePassword,
} from '../controllers/auth.controller.js';
import validate from '../middleware/validate.middleware.js';
import requireAuth from '../middleware/auth.middleware.js';

const router = Router();

const lowercased = (value) => value.toLowerCase();

const emailRule = (field = 'email') =>
  body(field)
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .customSanitizer(lowercased)
    .isLength({ max: 254 })
    .withMessage('Email cannot exceed 254 characters');

const passwordPolicy = [
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8, max: 72 })
    .withMessage('Password must be between 8 and 72 characters'),
];

const registerValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),
  emailRule(),
  ...passwordPolicy,
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Student Mobile Number is required')
    .matches(/^[0-9+\-\s()]{7,20}$/)
    .withMessage('Please provide a valid student mobile number')
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone cannot exceed 20 characters'),
  body('courseId').trim().notEmpty().withMessage('Select Course is required').isMongoId().withMessage('Invalid course id'),
  body('education')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 200 })
    .withMessage('Education cannot exceed 200 characters'),
  body('codingLevel')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 50 })
    .withMessage('Coding level cannot exceed 50 characters'),
  body('goal')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Goal cannot exceed 500 characters'),
  body('role').not().exists().withMessage('Role is assigned by the student registration flow'),
  body('status').not().exists().withMessage('Status is assigned by the student registration flow'),
];

const teacherRegistrationValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Teacher Name is required')
    .isLength({ max: 100 })
    .withMessage('Teacher Name cannot exceed 100 characters'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Teacher Phone Number is required')
    .matches(/^[0-9+\-\s()]{7,20}$/)
    .withMessage('Please provide a valid teacher phone number'),
  emailRule(),
  body('courseId').trim().notEmpty().withMessage('Select Course is required').isMongoId().withMessage('Invalid course id'),
  ...passwordPolicy,
  body('role').not().exists().withMessage('Role is assigned by the teacher registration flow'),
  body('status').not().exists().withMessage('Status is assigned by the teacher registration flow'),
];

const loginValidation = [emailRule(), body('password').notEmpty().withMessage('Password is required')];

const profileUpdateValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Student Name is required')
    .isLength({ max: 100 })
    .withMessage('Student Name cannot exceed 100 characters'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Mobile Number is required')
    .matches(/^[0-9+\-\s()]{7,20}$/)
    .withMessage('Please provide a valid mobile number')
    .isLength({ max: 20 })
    .withMessage('Mobile Number cannot exceed 20 characters'),
  body('email').not().exists().withMessage('Email cannot be updated here'),
  body('role').not().exists().withMessage('Role cannot be updated here'),
  body('status').not().exists().withMessage('Status cannot be updated here'),
  body('courseId').not().exists().withMessage('Course cannot be updated here'),
  body('selectedCourseId').not().exists().withMessage('Course cannot be updated here'),
  body('password').not().exists().withMessage('Use the change password form to update password'),
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current Password is required'),
  body('newPassword')
    .notEmpty()
    .withMessage('New Password is required')
    .isLength({ min: 8, max: 72 })
    .withMessage('New Password must be between 8 and 72 characters'),
  body('confirmPassword')
    .notEmpty()
    .withMessage('Confirm Password is required')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Passwords do not match'),
  body('password').not().exists().withMessage('Use newPassword for password changes'),
];

const verifyEmailValidation = [
  query('token')
    .trim()
    .notEmpty()
    .withMessage('Verification token is required')
    .isHexadecimal()
    .withMessage('Invalid verification token')
    .isLength({ min: 64, max: 64 })
    .withMessage('Invalid verification token'),
];

const resendActivationValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .customSanitizer(lowercased),
];

const forgotPasswordValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .customSanitizer(lowercased),
];

const resetPasswordValidation = [
  body('token')
    .trim()
    .notEmpty()
    .withMessage('Reset token is required')
    .isHexadecimal()
    .withMessage('Invalid reset token')
    .isLength({ min: 64, max: 64 })
    .withMessage('Invalid reset token'),
  ...passwordPolicy,
];

const activateAccountValidation = [
  body('token')
    .trim()
    .notEmpty()
    .withMessage('Activation token is required')
    .isHexadecimal()
    .withMessage('Invalid activation token')
    .isLength({ min: 64, max: 64 })
    .withMessage('Invalid activation token'),
  ...passwordPolicy,
];

router.post('/register', validate(registerValidation), register);
router.post('/teachers/register', validate(teacherRegistrationValidation), registerTeacher);
router.get('/verify-email', validate(verifyEmailValidation), verifyEmail);
router.post('/resend-activation', validate(resendActivationValidation), requestActivationEmail);
router.post('/activate-account', validate(activateAccountValidation), activateAccount);
router.post('/forgot-password', validate(forgotPasswordValidation), forgotPassword);
router.post('/reset-password', validate(resetPasswordValidation), resetPassword);
router.post('/logout', requireAuth, logout);
router.post('/login', validate(loginValidation), login);
router.get('/me', requireAuth, me);
router.patch('/me', requireAuth, validate(profileUpdateValidation), updateMe);
router.patch('/change-password', requireAuth, validate(changePasswordValidation), changePassword);

export default router;
