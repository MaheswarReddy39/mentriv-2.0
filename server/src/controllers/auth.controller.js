import asyncHandler from '../utils/async-handler.js';
import authService from '../services/auth.service.js';

const register = asyncHandler(async (req, res) => {
  const { user } = await authService.registerUser(req.body);

  res.status(201).json({
    status: 'success',
    message: 'Student registration submitted. Admin approval is required before login.',
    data: { user },
  });
});

const registerTeacher = asyncHandler(async (req, res) => {
  const { user } = await authService.registerTeacher(req.body);

  res.status(201).json({
    status: 'success',
    message: 'Teacher registration submitted. Admin approval is required before login.',
    data: { user },
  });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { user } = await authService.verifyEmail(req.query.token);

  res.status(200).json({
    status: 'success',
    message: 'Email verified successfully',
    data: { user },
  });
});

const requestActivationEmail = asyncHandler(async (req, res) => {
  const { message } = await authService.requestActivationEmail(req.body);

  res.status(200).json({
    status: 'success',
    message,
  });
});

const activateAccount = asyncHandler(async (req, res) => {
  const { user } = await authService.activateAccount(req.body);

  res.status(200).json({
    status: 'success',
    message: 'Account activated successfully. You can now log in.',
    data: { user },
  });
});

const login = asyncHandler(async (req, res) => {
  const { accessToken, user } = await authService.loginUser(req.body);

  res.status(200).json({
    status: 'success',
    message: 'Login successful',
    data: { accessToken, tokenType: 'Bearer', user },
  });
});

const me = asyncHandler(async (req, res) => {
  const { user } = await authService.getCurrentUser(req.user.id);

  res.status(200).json({
    status: 'success',
    data: { user },
  });
});

const updateMe = asyncHandler(async (req, res) => {
  const { user } = await authService.updateCurrentUserProfile(req.user.id, req.body);

  res.status(200).json({
    status: 'success',
    message: 'Profile updated successfully',
    data: { user },
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const { accessToken, user } = await authService.changeCurrentUserPassword(req.user.id, req.body);

  res.status(200).json({
    status: 'success',
    message: 'Password changed successfully',
    data: { accessToken, tokenType: 'Bearer', user },
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { message } = await authService.forgotPassword(req.body);

  res.status(200).json({
    status: 'success',
    message,
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { user } = await authService.resetPassword(req.body);

  res.status(200).json({
    status: 'success',
    message: 'Password has been reset successfully. Please log in with your new password.',
    data: { user },
  });
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user.id);

  res.status(200).json({
    status: 'success',
    message:
      'Logged out successfully. All sessions for this account have been invalidated.',
  });
});

export {
  register,
  registerTeacher,
  verifyEmail,
  requestActivationEmail,
  activateAccount,
  forgotPassword,
  resetPassword,
  logout,
  login,
  me,
  updateMe,
  changePassword,
};
