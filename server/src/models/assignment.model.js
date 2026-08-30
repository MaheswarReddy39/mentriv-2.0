import mongoose from 'mongoose';

const STATUSES = ['draft', 'published', 'archived'];
const ASSIGNMENT_TYPES = ['normalTest'];

const assignmentSchema = new mongoose.Schema(
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
    assignmentType: {
      type: String,
      enum: {
        values: ASSIGNMENT_TYPES,
        message: 'Assignment type must be normalTest',
      },
      default: 'normalTest',
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxLength: [2000, 'Description cannot exceed 2000 characters'],
    },
    instructions: {
      type: String,
      trim: true,
      default: '',
      maxLength: [5000, 'Instructions cannot exceed 5000 characters'],
    },
    dueDate: {
      type: Date,
      default: null,
    },
    maxMarks: {
      type: Number,
      required: [true, 'Max marks is required'],
      default: 100,
      min: [0, 'Max marks cannot be negative'],
    },
    attachments: [
      {
        _id: false,
        title: {
          type: String,
          required: [true, 'Attachment title is required'],
          trim: true,
          maxLength: [200, 'Attachment title cannot exceed 200 characters'],
        },
        url: {
          type: String,
          required: [true, 'Attachment URL is required'],
          trim: true,
          maxLength: [2048, 'Attachment URL cannot exceed 2048 characters'],
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

assignmentSchema.index({ courseId: 1, status: 1 });
assignmentSchema.index({ courseId: 1, status: 1, dueDate: 1 });
assignmentSchema.index({ status: 1, dueDate: 1 });

const Assignment = mongoose.model('Assignment', assignmentSchema);

export default Assignment;
