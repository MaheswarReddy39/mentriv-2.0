import mongoose from 'mongoose';

const ROLES = ['student', 'teacher', 'admin', 'superAdmin'];
const STATUSES = ['pending', 'accepted', 'rejected', 'active', 'inactive'];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxLength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      maxLength: [254, 'Email cannot exceed 254 characters'],
      match: [EMAIL_REGEX, 'Please provide a valid email address'],
    },
    phone: {
      type: String,
      trim: true,
      default: '',
      maxLength: [20, 'Phone cannot exceed 20 characters'],
    },
    passwordHash: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: { values: ROLES, message: 'Role must be one of: student, teacher, admin, superAdmin' },
      default: 'student',
    },
    selectedCourseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
    },
    education: {
      type: String,
      trim: true,
      default: '',
      maxLength: [200, 'Education cannot exceed 200 characters'],
    },
    codingLevel: {
      type: String,
      trim: true,
      default: '',
      maxLength: [50, 'Coding level cannot exceed 50 characters'],
    },
    goal: {
      type: String,
      trim: true,
      default: '',
      maxLength: [500, 'Goal cannot exceed 500 characters'],
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    accountActivated: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: {
        values: STATUSES,
        message: 'Status must be one of: pending, accepted, rejected, active, inactive',
      },
      default() {
        return this.role === 'student' ? 'pending' : 'active';
      },
    },
    firebaseId: {
      type: String,
      trim: true,
      default: undefined,
      unique: true,
      sparse: true,
    },
    emailVerificationToken: {
      type: String,
      default: null,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      default: null,
      select: false,
    },
    accountActivationToken: {
      type: String,
      default: null,
      select: false,
    },
    accountActivationExpires: {
      type: Date,
      default: null,
      select: false,
    },
    passwordResetToken: {
      type: String,
      default: null,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      default: null,
      select: false,
    },
    tokenVersion: {
      type: Number,
      default: 0,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);

export default User;
