import mongoose from 'mongoose';

const STATUSES = ['submitted', 'reviewed', 'returned', 'late'];
const ACTIVE_STATUSES = ['submitted', 'late'];

const submissionSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required'],
    },
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      required: [true, 'Assignment reference is required'],
    },
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
    submissionText: {
      type: String,
      trim: true,
      default: '',
      maxLength: [5000, 'Submission text cannot exceed 5000 characters'],
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
    githubRepositoryName: {
      type: String,
      trim: true,
      default: '',
      maxLength: [120, 'GitHub repository name cannot exceed 120 characters'],
    },
    githubRepositoryUrl: {
      type: String,
      trim: true,
      default: '',
      maxLength: [2048, 'GitHub repository URL cannot exceed 2048 characters'],
    },
    status: {
      type: String,
      enum: {
        values: STATUSES,
        message: 'Status must be one of: submitted, reviewed, returned, late',
      },
      default: 'submitted',
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    isLate: {
      type: Boolean,
      default: false,
    },
    marks: {
      type: Number,
      default: null,
      min: [0, 'Marks cannot be negative'],
    },
    feedback: {
      type: String,
      trim: true,
      default: '',
      maxLength: [2000, 'Feedback cannot exceed 2000 characters'],
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    activeSubmission: {
      type: Boolean,
      default() {
        return ACTIVE_STATUSES.includes(this.status);
      },
    },
  },
  {
    timestamps: true,
  }
);

submissionSchema.pre('validate', function syncActiveSubmission() {
  this.activeSubmission = ACTIVE_STATUSES.includes(this.status);
});

submissionSchema.index(
  { studentId: 1, assignmentId: 1 },
  {
    unique: true,
    partialFilterExpression: { activeSubmission: true },
    name: 'unique_active_student_assignment',
  }
);

submissionSchema.index({ studentId: 1, assignmentId: 1, attemptNumber: 1 }, { unique: true });
submissionSchema.index({ studentId: 1, status: 1 });
submissionSchema.index({ assignmentId: 1, status: 1 });
submissionSchema.index({ courseId: 1, status: 1 });

const Submission = mongoose.model('Submission', submissionSchema);

export default Submission;
