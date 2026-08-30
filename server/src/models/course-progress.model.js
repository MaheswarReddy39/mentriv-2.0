import mongoose from 'mongoose';

const lessonCompletionSchema = new mongoose.Schema(
  {
    _id: false,
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Lesson reference is required'],
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const assignmentCompletionSchema = new mongoose.Schema(
  {
    _id: false,
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      required: [true, 'Assignment reference is required'],
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const mcqCompletionSchema = new mongoose.Schema(
  {
    _id: false,
    mcqTestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'McqTest',
      required: [true, 'MCQ test reference is required'],
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const courseProgressSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student reference is required'],
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
    },
    completedLessons: {
      type: [lessonCompletionSchema],
      default: [],
    },
    completedAssignments: {
      type: [assignmentCompletionSchema],
      default: [],
    },
    completedMcqs: {
      type: [mcqCompletionSchema],
      default: [],
    },
    overallPercentage: {
      type: Number,
      default: 0,
      min: [0, 'Overall percentage cannot be below 0'],
      max: [100, 'Overall percentage cannot exceed 100'],
    },
    lastCompletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'course_progress',
  }
);

courseProgressSchema.index({ studentId: 1, courseId: 1 }, { unique: true });
courseProgressSchema.index({ courseId: 1 });

const CourseProgress = mongoose.model('CourseProgress', courseProgressSchema);

export default CourseProgress;
