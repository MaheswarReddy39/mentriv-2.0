import mongoose from 'mongoose';

const STATUSES = ['draft', 'published', 'archived'];

const questionSchema = new mongoose.Schema(
  {
    _id: false,
    question: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
      maxLength: [1000, 'Question text cannot exceed 1000 characters'],
    },
    options: {
      type: [String],
      required: [true, 'Options are required'],
      validate: [
        {
          validator: (value) => Array.isArray(value) && value.length >= 2,
          message: 'Each question must have at least two options',
        },
        {
          validator: (value) => value.every((option) => typeof option === 'string' && option.trim().length > 0),
          message: 'Options cannot be empty',
        },
        {
          validator: (value) => new Set(value.map((option) => option.trim().toLowerCase())).size === value.length,
          message: 'Options must be unique',
        },
      ],
    },
    correctOption: {
      type: Number,
      required: [true, 'Correct option is required'],
      validate: {
        validator(value) {
          return Number.isInteger(value) && value >= 0 && value < this.options.length;
        },
        message: 'Correct option must reference an existing option index (0-based)',
      },
    },
    marks: {
      type: Number,
      default: 1,
      min: [0, 'Marks cannot be negative'],
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
    explanation: {
      type: String,
      trim: true,
      default: '',
      maxLength: [2000, 'Explanation cannot exceed 2000 characters'],
    },
  },
  { _id: false }
);

const mcqSchema = new mongoose.Schema(
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
    questions: {
      type: [questionSchema],
      default: [],
    },
    duration: {
      type: Number,
      default: 0,
      min: [0, 'Duration cannot be negative'],
    },
    passingScore: {
      type: Number,
      default: 0,
      min: [0, 'Passing score cannot be negative'],
      max: [100, 'Passing score cannot exceed 100'],
    },
    status: {
      type: String,
      enum: { values: STATUSES, message: 'Status must be one of: draft, published, archived' },
      default: 'draft',
    },
  },
  {
    timestamps: true,
    collection: 'mcq_tests',
  }
);

mcqSchema.index({ courseId: 1, status: 1 });
mcqSchema.index({ status: 1, createdAt: -1 });

const McqTest = mongoose.model('McqTest', mcqSchema);

export default McqTest;
