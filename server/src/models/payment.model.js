import mongoose from 'mongoose';

const STATUSES = ['pending', 'verified', 'rejected'];
const PAYMENT_METHODS = ['upi'];
const CURRENCY_REGEX = /^[A-Z]{3}$/;

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    enrollmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Enrollment',
      required: [true, 'Enrollment reference is required'],
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'INR',
      match: [CURRENCY_REGEX, 'Currency must be a 3-letter ISO code (e.g., INR)'],
    },
    paymentMethod: {
      type: String,
      enum: {
        values: PAYMENT_METHODS,
        message: 'Payment method must be one of: upi',
      },
      default: 'upi',
    },
    transactionId: {
      type: String,
      trim: true,
      default: '',
      maxLength: [100, 'Transaction ID cannot exceed 100 characters'],
    },
    screenshotUrl: {
      type: String,
      trim: true,
      default: '',
      maxLength: [2048, 'Screenshot URL cannot exceed 2048 characters'],
    },
    status: {
      type: String,
      enum: { values: STATUSES, message: 'Status must be one of: pending, verified, rejected' },
      default: 'pending',
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: '',
      maxLength: [500, 'Rejection reason cannot exceed 500 characters'],
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ enrollmentId: 1 });
paymentSchema.index({ courseId: 1, status: 1 });
paymentSchema.index({ status: 1, submittedAt: -1 });
paymentSchema.index({ transactionId: 1 });

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
