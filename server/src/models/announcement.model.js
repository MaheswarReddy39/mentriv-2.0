import mongoose from 'mongoose';

const ANNOUNCEMENT_TYPES = ['general', 'class', 'assignment', 'payment', 'system'];
const AUDIENCES = ['all', 'students', 'admins'];
const STATUSES = ['draft', 'published', 'archived'];

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxLength: [150, 'Title cannot exceed 150 characters'],
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
      trim: true,
      maxLength: [5000, 'Content cannot exceed 5000 characters'],
    },
    type: {
      type: String,
      enum: {
        values: ANNOUNCEMENT_TYPES,
        message: 'Type must be one of: general, class, assignment, payment, system',
      },
      default: 'general',
    },
    audience: {
      type: String,
      enum: { values: AUDIENCES, message: 'Audience must be one of: all, students, admins' },
      default: 'all',
    },
    status: {
      type: String,
      enum: { values: STATUSES, message: 'Status must be one of: draft, published, archived' },
      default: 'draft',
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator reference is required'],
    },
  },
  {
    timestamps: true,
  }
);

announcementSchema.index({ status: 1, audience: 1, publishedAt: -1 });
announcementSchema.index({ status: 1, type: 1 });

const Announcement = mongoose.model('Announcement', announcementSchema);

export default Announcement;
