import mongoose from 'mongoose';

const STATUSES = ['pending', 'approved', 'rejected', 'completed', 'cancelled'];
const ACTIVE_STATUSES = ['pending', 'approved'];

const enrollmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
    },
    status: {
      type: String,
      enum: {
        values: STATUSES,
        message: 'Status must be one of: pending, approved, rejected, completed, cancelled',
      },
      default: 'pending',
    },
    enrolledAt: {
      type: Date,
      default: Date.now,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    activeEnrollment: {
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

enrollmentSchema.pre('validate', function syncActiveEnrollment() {
  this.activeEnrollment = ACTIVE_STATUSES.includes(this.status);
});

enrollmentSchema.index(
  { userId: 1, courseId: 1 },
  {
    unique: true,
    partialFilterExpression: { activeEnrollment: true },
    name: 'unique_active_user_course',
  }
);

enrollmentSchema.index({ userId: 1, status: 1 });
enrollmentSchema.index({ courseId: 1, status: 1 });

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);

export default Enrollment;
