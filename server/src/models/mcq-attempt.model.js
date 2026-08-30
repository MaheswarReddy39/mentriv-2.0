import mongoose from 'mongoose';

const STATUSES = ['in_progress', 'submitted', 'evaluated', 'abandoned'];

const mcqAnswerSchema = new mongoose.Schema(
  {
    _id: false,
    questionOrder: {
      type: Number,
      required: [true, 'Question order is required'],
      min: [0, 'Question order cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Question order must be an integer',
      },
    },
    selectedOption: {
      type: Number,
      default: null,
      min: [0, 'Selected option cannot be negative'],
      validate: {
        validator: (value) => value === null || Number.isInteger(value),
        message: 'Selected option must be an integer or null',
      },
    },
    marksAwarded: {
      type: Number,
      default: 0,
      min: [0, 'Marks awarded cannot be negative'],
    },
    isCorrect: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const mcqAttemptSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required'],
    },
    mcqTestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'McqTest',
      required: [true, 'MCQ test reference is required'],
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
    },
    answers: {
      type: [mcqAnswerSchema],
      default: [],
    },
    score: {
      type: Number,
      default: 0,
      min: [0, 'Score cannot be negative'],
    },
    totalMarks: {
      type: Number,
      default: 0,
      min: [0, 'Total marks cannot be negative'],
    },
    percentage: {
      type: Number,
      default: 0,
      min: [0, 'Percentage cannot be below 0'],
      max: [100, 'Percentage cannot exceed 100'],
    },
    passed: {
      type: Boolean,
      default: false,
    },
    attemptNumber: {
      type: Number,
      default: 1,
      min: [1, 'Attempt number must be at least 1'],
      validate: {
        validator: Number.isInteger,
        message: 'Attempt number must be an integer',
      },
    },
    status: {
      type: String,
      enum: {
        values: STATUSES,
        message: 'Status must be one of: in_progress, submitted, evaluated, abandoned',
      },
      default: 'in_progress',
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'mcq_attempts',
  }
);

mcqAttemptSchema.index({ studentId: 1, mcqTestId: 1, attemptNumber: 1 }, { unique: true });
mcqAttemptSchema.index({ studentId: 1, status: 1 });
mcqAttemptSchema.index({ mcqTestId: 1, status: 1 });
mcqAttemptSchema.index({ courseId: 1, status: 1 });

const McqAttempt = mongoose.model('McqAttempt', mcqAttemptSchema);

export default McqAttempt;
