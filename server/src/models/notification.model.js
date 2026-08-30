import mongoose from 'mongoose';

const RECIPIENT_ROLES = ['student', 'teacher', 'admin', 'superAdmin'];
const NOTIFICATION_TYPES = ['class', 'assignment', 'payment', 'enrollment', 'announcement', 'system'];
const AUDIENCES = ['all', 'students', 'teachers', 'admins'];

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient reference is required'],
    },
    recipientRole: {
      type: String,
      enum: {
        values: RECIPIENT_ROLES,
        message: 'Recipient role must be one of: student, teacher, admin, superAdmin',
      },
      required: [true, 'Recipient role is required'],
    },
    type: {
      type: String,
      enum: {
        values: NOTIFICATION_TYPES,
        message:
          'Notification type must be one of: class, assignment, payment, enrollment, announcement, system',
      },
      required: [true, 'Notification type is required'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxLength: [150, 'Title cannot exceed 150 characters'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxLength: [1000, 'Message cannot exceed 1000 characters'],
    },
    link: {
      type: String,
      trim: true,
      default: '',
      maxLength: [2048, 'Link cannot exceed 2048 characters'],
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    audience: {
      type: String,
      enum: {
        values: AUDIENCES,
        message: 'Audience must be one of: all, students, teachers, admins',
      },
      default: 'all',
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, type: 1 });
notificationSchema.index({ createdBy: 1, batchId: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
