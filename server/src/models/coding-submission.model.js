import mongoose from 'mongoose';

const STATUSES = [
  'submitted',
  'accepted',
  'failed',
  'wrong_answer',
  'runtime_error',
  'time_limit_exceeded',
  'compilation_error',
];

const checkSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      trim: true,
      default: '',
      maxLength: [300, 'Check label cannot exceed 300 characters'],
    },
    passed: {
      type: Boolean,
      default: false,
    },
    detail: {
      type: String,
      trim: true,
      default: '',
      maxLength: [1000, 'Check detail cannot exceed 1000 characters'],
    },
  },
  { _id: false }
);

const codingSubmissionSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CodingTask',
      required: [true, 'Coding task reference is required'],
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required'],
    },
    // Course under which this attempt was made; attempts and history are
    // scoped per (task, student, course) because tasks are shared across courses.
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
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
        message:
          'Status must be one of: submitted, accepted, failed, wrong_answer, runtime_error, time_limit_exceeded, compilation_error',
      },
      default: 'submitted',
    },
    code: {
      type: String,
      trim: true,
      default: '',
      maxLength: [10000, 'Code cannot exceed 10000 characters'],
    },
    language: {
      type: String,
      trim: true,
      default: '',
      maxLength: [40, 'Language cannot exceed 40 characters'],
    },
    score: {
      type: Number,
      default: null,
    },
    passedTests: {
      type: Number,
      default: null,
      min: [0, 'Passed tests cannot be negative'],
    },
    totalTests: {
      type: Number,
      default: null,
      min: [0, 'Total tests cannot be negative'],
    },
    executionDetails: {
      type: String,
      trim: true,
      default: null,
      maxLength: [2000, 'Execution details cannot exceed 2000 characters'],
    },
    checks: {
      type: [checkSchema],
      default: [],
      validate: {
        validator: (value) => value.length <= 500,
        message: 'Checks cannot exceed 500 items',
      },
    },
  },
  {
    timestamps: true,
    collection: 'coding_submissions',
  }
);

codingSubmissionSchema.index(
  { taskId: 1, studentId: 1, courseId: 1, attemptNumber: 1 },
  { unique: true }
);
codingSubmissionSchema.index({ studentId: 1, createdAt: -1 });
codingSubmissionSchema.index({ taskId: 1, status: 1 });

const CodingSubmission = mongoose.model('CodingSubmission', codingSubmissionSchema);

export default CodingSubmission;
