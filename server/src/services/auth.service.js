import User from '../models/user.model.js';
import Course from '../models/course.model.js';
import Enrollment from '../models/enrollment.model.js';
import ApiError from '../utils/api-error.js';
import { hashPassword, comparePassword } from './password.service.js';
import {
  generateAccessToken,
  generateEmailVerificationToken,
  hashEmailVerificationToken,
  generateAccountActivationToken,
  hashAccountActivationToken,
  generatePasswordResetToken,
  hashPasswordResetToken,
} from './token.service.js';
import emailService from './email.service.js';
import env from '../config/env.js';

// Pre-computed bcrypt hash used to equalize response timing when the email does not exist,
// so login responses cannot reveal whether an account is registered.
const DUMMY_PASSWORD_HASH =
  '$2b$12$C6UzMDM.H6dfI/f/IKcEeO7ZBpQ0W4NlFDrLZACs2DnEm9iEvHWHC';

const normalizeEmail = (email) => String(email).trim().toLowerCase();

const isLoginEnabledStatus = (status) => ['active', 'accepted'].includes(status);

const sanitizeUser = (user) => {
  const course = user.selectedCourseId;
  const selectedCourse =
    course && course.title
      ? {
          id: course._id.toString(),
          title: course.title,
          level: course.level,
        }
      : null;

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    selectedCourseId: course?._id?.toString?.() || course?.toString?.() || null,
    selectedCourse,
    education: user.education,
    codingLevel: user.codingLevel,
    goal: user.goal,
    isEmailVerified: user.isEmailVerified,
    accountActivated: user.accountActivated,
    status: user.status,
    createdAt: user.createdAt,
  };
};

const registerUser = async ({ name, email, password, phone, courseId, education, codingLevel, goal }) => {
  const normalizedEmail = normalizeEmail(email);

  const existingUser = await User.exists({ email: normalizedEmail });
  if (existingUser) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const courseExists = await Course.exists({
    _id: courseId,
    status: { $ne: 'archived' },
  });
  if (!courseExists) {
    throw new ApiError(400, 'Selected course was not found');
  }

  const passwordHash = await hashPassword(password);

  const user = await User.create({
    name,
    email: normalizedEmail,
    phone,
    education: education ?? '',
    codingLevel: codingLevel ?? '',
    goal: goal ?? '',
    passwordHash,
    role: 'student',
    status: 'pending',
    selectedCourseId: courseId,
    isEmailVerified: true,
    accountActivated: false,
  });

  await Enrollment.create({
    userId: user._id,
    courseId,
    status: 'pending',
  });

  try {
    const course = await Course.findById(courseId).select('title').lean();
    const courseTitle = course?.title || 'your selected course';
    await emailService.sendRegistrationConfirmationEmail({
      to: normalizedEmail,
      name,
      courseTitle,
    });
  } catch (error) {
    console.error(`[email] Registration confirmation email failed: ${error.message}`);
  }

  if (env.adminEmail) {
    try {
      const admin = await User.findOne({ email: env.adminEmail, role: { $in: ['admin', 'superAdmin'] } }).select('name').lean();
      const course = await Course.findById(courseId).select('title').lean();
      await emailService.sendNewStudentRegistrationEmail({
        to: env.adminEmail,
        adminName: admin?.name || 'Admin',
        studentName: name,
        studentEmail: normalizedEmail,
        courseTitle: course?.title || 'your selected course',
      });
    } catch (error) {
      console.error(`[email] Admin registration notification failed: ${error.message}`);
    }
  }

  return { user: sanitizeUser(user) };
};

const registerTeacher = async ({ name, phone, email, courseId, password }) => {
  const normalizedEmail = normalizeEmail(email);

  const existingUser = await User.exists({ email: normalizedEmail });
  if (existingUser) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const courseExists = await Course.exists({
    _id: courseId,
    status: { $ne: 'archived' },
  });
  if (!courseExists) {
    throw new ApiError(400, 'Selected course was not found');
  }

  const passwordHash = await hashPassword(password);

  const user = await User.create({
    name,
    email: normalizedEmail,
    phone,
    role: 'teacher',
    status: 'pending',
    selectedCourseId: courseId,
    isEmailVerified: true,
    accountActivated: true,
    passwordHash,
  });

  try {
    await emailService.sendTeacherRegistrationConfirmationEmail({
      to: normalizedEmail,
      teacherName: name,
    });
  } catch (error) {
    console.error(`[email] Teacher registration confirmation email failed: ${error.message}`);
  }

  if (env.adminEmail) {
    try {
      const admin = await User.findOne({ email: env.adminEmail, role: { $in: ['admin', 'superAdmin'] } }).select('name').lean();
      await emailService.sendNewTeacherRegistrationEmail({
        to: env.adminEmail,
        adminName: admin?.name || 'Admin',
        teacherName: name,
        teacherEmail: normalizedEmail,
      });
    } catch (error) {
      console.error(`[email] Admin teacher registration notification failed: ${error.message}`);
    }
  }

  return { user: sanitizeUser(user) };
};

const createActivationForApprovedUser = async (user) => {
  const { token, hashedToken, expiresAt } = generateAccountActivationToken();
  user.accountActivationToken = hashedToken;
  user.accountActivationExpires = expiresAt;
  user.accountActivated = false;
  await user.save();
  await emailService.sendAccountActivationEmail({ to: user.email, name: user.name, token });
};

const verifyEmail = async (rawToken) => {
  const hashedToken = hashEmailVerificationToken(rawToken);

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: new Date() },
  }).select('+emailVerificationToken +emailVerificationExpires');

  if (!user) {
    throw new ApiError(400, 'Invalid or expired verification token');
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  if (!user.accountActivated) {
    await sendActivationEmail(user);
  }

  return { user: sanitizeUser(user) };
};

const sendActivationEmail = async (user) => {
  const { token, hashedToken, expiresAt } = generateAccountActivationToken();
  user.accountActivationToken = hashedToken;
  user.accountActivationExpires = expiresAt;
  await user.save();
  await emailService.sendAccountActivationEmail({ to: user.email, name: user.name, token });
};

const requestActivationEmail = async ({ email }) => {
  const GENERIC_RESPONSE = {
    message:
      'If this account can be activated, an activation email has been sent. Please check your inbox.',
  };

  const normalizedEmail = normalizeEmail(email);
  const user = await User.findOne({ email: normalizedEmail }).select(
    '+accountActivationToken +accountActivationExpires'
  );

  if (!user || user.accountActivated || !isLoginEnabledStatus(user.status)) {
    return GENERIC_RESPONSE;
  }

  await sendActivationEmail(user);
  return GENERIC_RESPONSE;
};

const activateAccount = async ({ token, password }) => {
  const hashedToken = hashAccountActivationToken(token);

  const user = await User.findOne({
    accountActivationToken: hashedToken,
    accountActivationExpires: { $gt: new Date() },
  }).select('+accountActivationToken +accountActivationExpires');

  if (!user) {
    throw new ApiError(400, 'Invalid or expired activation token');
  }

  user.passwordHash = await hashPassword(password);
  user.accountActivated = true;
  user.accountActivationToken = undefined;
  user.accountActivationExpires = undefined;
  await user.save();

  return { user: sanitizeUser(user) };
};

const loginUser = async ({ email, password }) => {
  const normalizedEmail = normalizeEmail(email);

  const user = await User.findOne({ email: normalizedEmail }).select('+tokenVersion');

  if (!user) {
    await comparePassword(password, DUMMY_PASSWORD_HASH);
    throw new ApiError(401, 'Invalid email or password');
  }

  const passwordMatches = await comparePassword(password, user.passwordHash || '');
  if (!passwordMatches) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (user.status === 'pending') {
    throw new ApiError(403, 'Your account is pending approval.');
  }

  if (user.status === 'rejected') {
    throw new ApiError(403, 'Your account was rejected. Please contact support.');
  }

  if (!isLoginEnabledStatus(user.status)) {
    throw new ApiError(403, 'This account is inactive. Please contact support.');
  }

  if (!user.isEmailVerified || !user.accountActivated) {
    throw new ApiError(
      403,
      'Account verification and activation are required before logging in'
    );
  }

  const accessToken = generateAccessToken({
    sub: user._id.toString(),
    role: user.role,
    tv: user.tokenVersion ?? 0,
  });

  return { accessToken, user: sanitizeUser(user) };
};

const getCurrentUser = async (userId) => {
  const user = await User.findById(userId).populate('selectedCourseId', 'title level');
  if (!user) {
    throw new ApiError(404, 'User was not found');
  }

  return { user: sanitizeUser(user) };
};

const updateCurrentUserProfile = async (userId, { name, phone }) => {
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (phone !== undefined) updates.phone = phone;

  const user = await User.findByIdAndUpdate(userId, updates, {
    new: true,
    runValidators: true,
  }).populate('selectedCourseId', 'title level');

  if (!user) {
    throw new ApiError(404, 'User was not found');
  }

  return { user: sanitizeUser(user) };
};

const changeCurrentUserPassword = async (userId, { currentPassword, newPassword }) => {
  const user = await User.findById(userId).select('+tokenVersion').populate('selectedCourseId', 'title level');
  if (!user) {
    throw new ApiError(404, 'User was not found');
  }

  const passwordMatches = await comparePassword(currentPassword, user.passwordHash || '');
  if (!passwordMatches) {
    throw new ApiError(400, 'Current password is incorrect');
  }

  user.passwordHash = await hashPassword(newPassword);
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  await user.save();

  const accessToken = generateAccessToken({
    sub: user._id.toString(),
    role: user.role,
    tv: user.tokenVersion ?? 0,
  });

  return { accessToken, user: sanitizeUser(user) };
};

const forgotPassword = async ({ email }) => {
  const GENERIC_MESSAGE =
    'If an eligible account exists for this email, a password-reset email has been sent.';

  const normalizedEmail = normalizeEmail(email);
  const user = await User.findOne({ email: normalizedEmail }).select(
    '+passwordResetToken +passwordResetExpires'
  );

  if (!user || !user.accountActivated || !isLoginEnabledStatus(user.status)) {
    return { message: GENERIC_MESSAGE };
  }

  const { token, hashedToken, expiresAt } = generatePasswordResetToken();
  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = expiresAt;
  await user.save();

  await emailService.sendPasswordResetEmail({ to: user.email, name: user.name, token });

  return { message: GENERIC_MESSAGE };
};

const resetPassword = async ({ token, password }) => {
  const hashedToken = hashPasswordResetToken(token);

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    throw new ApiError(400, 'Invalid or expired reset token');
  }

  user.passwordHash = await hashPassword(password);
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  return { user: sanitizeUser(user) };
};

const logout = async (userId) => {
  await User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });
};

export default {
  registerUser,
  registerTeacher,
  createActivationForApprovedUser,
  getCurrentUser,
  updateCurrentUserProfile,
  changeCurrentUserPassword,
  verifyEmail,
  requestActivationEmail,
  activateAccount,
  forgotPassword,
  resetPassword,
  logout,
  loginUser,
};
