import asyncHandler from '../utils/async-handler.js';
import notificationService from '../services/notification.service.js';

const listNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.listNotifications(req.user.id, req.query);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const listAdminNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.listAdminNotifications(req.query);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const createAdminNotification = asyncHandler(async (req, res) => {
  const result = await notificationService.createAdminNotification(req.user, req.body);

  res.status(201).json({
    status: 'success',
    message: 'Notification published successfully',
    data: result,
  });
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const result = await notificationService.getUnreadCount(req.user.id);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const markNotificationRead = asyncHandler(async (req, res) => {
  const { notification } = await notificationService.markNotificationRead(
    req.user.id,
    req.params.id
  );

  res.status(200).json({
    status: 'success',
    message: 'Notification marked as read',
    data: { notification },
  });
});

const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllNotificationsRead(req.user.id);

  res.status(200).json({
    status: 'success',
    message: 'All notifications marked as read',
    data: { modifiedCount: result.modifiedCount },
  });
});

export {
  listNotifications,
  listAdminNotifications,
  createAdminNotification,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
};
