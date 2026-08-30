import mongoose from 'mongoose';

const STATUSES = ['draft', 'published', 'archived'];

const classSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxLength: [150, 'Title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxLength: [2000, 'Description cannot exceed 2000 characters'],
    },
    videoUrl: {
      type: String,
      trim: true,
      default: '',
      maxLength: [2048, 'Video URL cannot exceed 2048 characters'],
    },
    duration: {
      type: Number,
      default: 0,
      min: [0, 'Duration cannot be negative'],
    },
    module: {
      type: String,
      trim: true,
      default: '',
      maxLength: [200, 'Module cannot exceed 200 characters'],
    },
    order: {
      type: Number,
      default: 0,
      min: [0, 'Order cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Order must be an integer',
      },
    },
    resources: [
      {
        _id: false,
        title: {
          type: String,
          required: [true, 'Resource title is required'],
          trim: true,
          maxLength: [200, 'Resource title cannot exceed 200 characters'],
        },
        url: {
          type: String,
          required: [true, 'Resource URL is required'],
          trim: true,
          maxLength: [2048, 'Resource URL cannot exceed 2048 characters'],
        },
      },
    ],
    status: {
      type: String,
      enum: { values: STATUSES, message: 'Status must be one of: draft, published, archived' },
      default: 'draft',
    },
  },
  {
    timestamps: true,
  }
);

classSchema.index({ courseId: 1, status: 1, order: 1 });
classSchema.index({ courseId: 1, module: 1, order: 1 });

const Class = mongoose.model('Class', classSchema);

export default Class;
